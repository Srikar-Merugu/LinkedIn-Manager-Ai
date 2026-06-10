import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import pino from 'pino';
import { env } from '../../config/env';
import {
  LinkedInTokenResponse,
  LinkedInProfileResponse,
  LinkedInUserProfile,
  LinkedInExperience,
  LinkedInEducation,
  LinkedInSkill,
  LinkedInCertification,
  LinkedInProject,
  LinkedInActivity,
} from '../../types/linkedin';
import { ErrorRecoverySystem, ErrorCategory, ErrorSeverity } from '../ErrorRecoverySystem';
import { CachingLayer } from '../CachingLayer';

const logger = pino();

export class LinkedInService {
  private apiClient: AxiosInstance;
  private recoverySystem: ErrorRecoverySystem;
  private cachingLayer: CachingLayer;
  private readonly baseUrl = 'https://api.linkedin.com/v2';
  private readonly authUrl = 'https://www.linkedin.com/oauth/v2';

  constructor(recoverySystem: ErrorRecoverySystem, cachingLayer: CachingLayer) {
    this.recoverySystem = recoverySystem;
    this.cachingLayer = cachingLayer;

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    this.apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 429) {
          error.message = 'Rate limit exceeded';
          error.category = ErrorCategory.RATE_LIMIT;
        } else if (error.response?.status === 401) {
          error.message = 'Unauthorized - token may be expired';
          error.category = ErrorCategory.AUTH;
        } else if (error.code === 'ECONNABORTED') {
          error.message = 'Request timeout';
          error.category = ErrorCategory.TIMEOUT;
        }
        return Promise.reject(error);
      }
    );
  }

  getAuthorizationUrl(state?: string): string {
    const actualState = state || crypto.randomBytes(16).toString('hex');
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.LINKEDIN_CLIENT_ID || '',
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI || '',
      scope: (process.env.LINKEDIN_SCOPES || 'openid profile email w_member_social').split(' ').join(' '),
      state: actualState,
    });

    return `${this.authUrl}/authorization?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<LinkedInTokenResponse> {
    return this.recoverySystem.retryWithBackoff(
      async () => {
        const response = await axios.post<LinkedInTokenResponse>(
          `${this.authUrl}/accessToken`,
          new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            client_id: process.env.LINKEDIN_CLIENT_ID || '',
            client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
            redirect_uri: process.env.LINKEDIN_REDIRECT_URI || '',
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        return response.data;
      },
      {
        operation: 'exchangeCodeForToken',
        service: 'LinkedInService',
        category: ErrorCategory.API,
        severity: ErrorSeverity.HIGH,
        maxRetries: env.maxRetries,
      }
    );
  }

  async refreshAccessToken(refreshToken: string): Promise<LinkedInTokenResponse> {
    return this.recoverySystem.retryWithBackoff(
      async () => {
        const response = await axios.post<LinkedInTokenResponse>(
          `${this.authUrl}/accessToken`,
          new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            client_id: process.env.LINKEDIN_CLIENT_ID || '',
            client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
          }).toString(),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );

        return response.data;
      },
      {
        operation: 'refreshAccessToken',
        service: 'LinkedInService',
        category: ErrorCategory.API,
        severity: ErrorSeverity.HIGH,
        maxRetries: 2,
      }
    );
  }

  async getProfile(accessToken: string): Promise<LinkedInProfileResponse> {
    return this.recoverySystem.retryWithBackoff(
      async () => {
        const response = await this.apiClient.get<LinkedInProfileResponse>(
          '/userinfo',
          this.getAuthConfig(accessToken)
        );
        return response.data;
      },
      {
        operation: 'getProfile',
        service: 'LinkedInService',
        category: ErrorCategory.API,
        severity: ErrorSeverity.HIGH,
        maxRetries: env.maxRetries,
      }
    );
  }

  async getFullProfile(accessToken: string, linkedinId: string): Promise<LinkedInUserProfile> {
    const cacheKey = `linkedin:profile:${linkedinId}`;
    const cached = await this.cachingLayer.get<LinkedInUserProfile>(cacheKey);
    if (cached) return cached;

    const profile = await this.recoverySystem.retryWithBackoff(
      async () => {
        const [
          basicProfile,
          experience,
          education,
        ] = await Promise.all([
          this.fetchBasicProfile(accessToken),
          this.fetchExperience(accessToken),
          this.fetchEducation(accessToken),
        ]);

        const about = await this.fetchAbout(accessToken).catch(() => undefined);

        return {
          ...basicProfile,
          about: about?.localizedDescription || '',
          experience,
          education,
          skills: [],
          certifications: [],
          projects: [],
          activity: [],
        };
      },
      {
        operation: 'getFullProfile',
        service: 'LinkedInService',
        category: ErrorCategory.API,
        severity: ErrorSeverity.HIGH,
        maxRetries: env.maxRetries,
      }
    );

    await this.cachingLayer.set(cacheKey, profile, 300);
    return profile;
  }

  async getSkills(accessToken: string, profileId: string): Promise<LinkedInSkill[]> {
    const cacheKey = `linkedin:skills:${profileId}`;
    const cached = await this.cachingLayer.get<LinkedInSkill[]>(cacheKey);
    if (cached) return cached;

    const skills = await this.recoverySystem.retryWithBackoff(
      async () => {
        try {
          const response = await this.apiClient.get(
            '/rest/skillAssociations',
            {
              ...this.getAuthConfig(accessToken),
              params: {
                q: 'profileOwner',
                count: 50,
              },
            }
          );

          return (response.data.elements || []).map((elem: any) => ({
            name: elem.skill?.localizedName || 'Unknown Skill',
            endorsements: elem.endorsements?.total || 0,
            isTopSkill: elem.topSkill || false,
            category: elem.skill?.category?.localizedName,
          }));
        } catch {
          logger.warn('Skills API not available, returning empty array');
          return [];
        }
      },
      {
        operation: 'getSkills',
        service: 'LinkedInService',
        category: ErrorCategory.API,
        severity: ErrorSeverity.MEDIUM,
        maxRetries: 2,
      }
    );

    await this.cachingLayer.set(cacheKey, skills, 600);
    return skills;
  }

  async getActivity(
    accessToken: string,
    profileId: string,
    maxResults = 50
  ): Promise<LinkedInActivity[]> {
    const cacheKey = `linkedin:activity:${profileId}`;
    const cached = await this.cachingLayer.get<LinkedInActivity[]>(cacheKey);
    if (cached) return cached;

    const activity = await this.recoverySystem.retryWithBackoff(
      async () => {
        try {
          const response = await this.apiClient.get(
            '/rest/posts',
            {
              ...this.getAuthConfig(accessToken),
              params: {
                q: 'author',
                author: `urn:li:person:${profileId}`,
                count: Math.min(maxResults, 100),
                sortBy: 'CREATED_TIME',
              },
            }
          );

          return (response.data.elements || []).map((elem: any) => ({
            type: 'post',
            content: elem.commentary || elem.article?.content?.description,
            url: elem.landingUrl || elem.navigationUrl,
            timestamp: new Date(elem.created?.time || Date.now()),
            engagement: {
              likes: elem.socialDetail?.likes || 0,
              comments: elem.socialDetail?.comments || 0,
              shares: elem.socialDetail?.shares || 0,
            },
          }));
        } catch {
          logger.warn('Activity API not available, returning empty array');
          return [];
        }
      },
      {
        operation: 'getActivity',
        service: 'LinkedInService',
        category: ErrorCategory.API,
        severity: ErrorSeverity.MEDIUM,
        maxRetries: 2,
      }
    );

    await this.cachingLayer.set(cacheKey, activity, 300);
    return activity;
  }

  async revokeToken(accessToken: string): Promise<void> {
    try {
      await axios.delete(`${this.authUrl}/accessToken`, {
        params: {
          client_id: process.env.LINKEDIN_CLIENT_ID || '',
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || '',
          token: accessToken,
        },
      });
      logger.info('LinkedIn token revoked');
    } catch (error) {
      logger.warn({ error }, 'Failed to revoke LinkedIn token');
    }
  }

  private async fetchBasicProfile(accessToken: string): Promise<{
    id: string;
    firstName: string;
    lastName: string;
    headline?: string;
    vanityName?: string;
    profilePicture?: string;
    email?: string;
  }> {
    const response = await this.apiClient.get('/userinfo', this.getAuthConfig(accessToken));
    const data: LinkedInProfileResponse = response.data;

    return {
      id: data.sub,
      firstName: data.given_name || '',
      lastName: data.family_name || '',
      headline: data.name,
      vanityName: undefined,
      profilePicture: data.picture,
      email: data.email,
    };
  }

  private async fetchExperience(accessToken: string): Promise<LinkedInExperience[]> {
    try {
      const response = await this.apiClient.get(
        '/rest/positions',
        {
          ...this.getAuthConfig(accessToken),
          params: { q: 'profileOwner', count: 50 },
        }
      );

      return (response.data.elements || []).map((elem: any) => ({
        title: elem.title || '',
        company: elem.company?.localizedName || '',
        companyLogo: elem.company?.logoUrl,
        companyUrl: elem.company?.url,
        location: elem.locationName,
        description: elem.description,
        startDate: elem.startDate ? {
          month: elem.startDate.month,
          year: elem.startDate.year,
        } : undefined,
        endDate: elem.endDate ? {
          month: elem.endDate.month,
          year: elem.endDate.year,
        } : undefined,
        currentlyWorking: !elem.endDate,
        employmentType: elem.employmentType?.localizedName,
        industry: elem.industry?.localizedName,
        durationInMonths: this.calculateDuration(elem.startDate, elem.endDate),
      }));
    } catch {
      logger.warn('Experience API not available, returning empty array');
      return [];
    }
  }

  private async fetchEducation(accessToken: string): Promise<LinkedInEducation[]> {
    try {
      const response = await this.apiClient.get(
        '/rest/educations',
        {
          ...this.getAuthConfig(accessToken),
          params: { q: 'profileOwner', count: 20 },
        }
      );

      return (response.data.elements || []).map((elem: any) => ({
        school: elem.school?.localizedName || '',
        schoolLogo: elem.school?.logoUrl,
        degree: elem.degree?.localizedName,
        fieldOfStudy: elem.fieldOfStudy?.localizedName,
        grade: elem.grade,
        description: elem.description,
        startDate: elem.startDate ? {
          month: elem.startDate.month,
          year: elem.startDate.year,
        } : undefined,
        endDate: elem.endDate ? {
          month: elem.endDate.month,
          year: elem.endDate.year,
        } : undefined,
        activities: elem.activities,
      }));
    } catch {
      logger.warn('Education API not available, returning empty array');
      return [];
    }
  }

  private async fetchAbout(accessToken: string): Promise<{ localizedDescription?: string } | null> {
    try {
      const response = await this.apiClient.get(
        '/rest/profile',
        {
          ...this.getAuthConfig(accessToken),
          params: {
            projection: '(localizedDescription,localizedHeadline)',
          },
        }
      );
      return response.data;
    } catch {
      return null;
    }
  }

  private getAuthConfig(accessToken: string): AxiosRequestConfig {
    return {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    };
  }

  private calculateDuration(
    start?: { month?: number; year: number },
    end?: { month?: number; year: number }
  ): number {
    if (!start) return 0;

    const startDate = new Date(start.year, start.month ? start.month - 1 : 0);
    const endDate = end
      ? new Date(end.year, end.month ? end.month - 1 : 11)
      : new Date();

    return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }
}
