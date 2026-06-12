const API_BASE = '/api';

async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
    const err = new Error(error.error || `HTTP ${response.status}`);
    (err as any).details = error.details;
    (err as any).action = error.action;
    (err as any).statusCode = response.status;
    throw err;
  }

  return response.json();
}

export const api = {
  auth: {
    getLinkedInUrl: () =>
      fetchAPI<{ url: string }>('/auth/linkedin'),

    exchangeCode: (code: string) =>
      fetchAPI<{ accessToken: string; refreshToken?: string; expiresIn: number; profile: any }>(
        '/auth/token',
        { method: 'POST', body: JSON.stringify({ code }) }
      ),

    refreshToken: (refreshToken: string) =>
      fetchAPI<{ accessToken: string; refreshToken?: string; expiresIn: number }>(
        '/auth/refresh',
        { method: 'POST', body: JSON.stringify({ refreshToken }) }
      ),
  },

  profile: {
    getByLinkedInId: (linkedinId: string) =>
      fetchAPI<any>(`/profile?linkedinId=${linkedinId}`),

    getByUser: () =>
      fetchAPI<any>('/profile/by-user'),

    getById: (profileId: string) =>
      fetchAPI<any>(`/profile/${profileId}`),

    getSummary: (profileId: string) =>
      fetchAPI<any>(`/profile/${profileId}/summary`),

    getSkills: (profileId: string) =>
      fetchAPI<{ skills: any[]; total: number }>(`/profile/${profileId}/skills`),

    getActivity: (profileId: string) =>
      fetchAPI<{ activity: any[]; total: number }>(`/profile/${profileId}/activity`),

    sync: (userId: string, accessToken: string) =>
      fetchAPI<any>(
        '/profile/sync',
        { method: 'POST', body: JSON.stringify({ userId, accessToken }) }
      ),
  },

  analysis: {
    getReport: (profileId: string) =>
      fetchAPI<any>(`/analysis/report/${profileId}`),

    getScores: (profileId: string) =>
      fetchAPI<any>(`/analysis/report/${profileId}/scores`),

    getRecommendations: (profileId: string) =>
      fetchAPI<any>(`/analysis/report/${profileId}/recommendations`),

    getActionPlan: (profileId: string) =>
      fetchAPI<any>(`/analysis/report/${profileId}/action-plan`),
  },

  onboarding: {
    getState: () =>
      fetchAPI<{ state: any; totalSteps: number; completedCount: number; percentage: number; currentStepIndex: number }>('/onboarding/state'),

    start: () =>
      fetchAPI<any>('/onboarding/start', { method: 'POST' }),

    completeWelcome: (data?: any) =>
      fetchAPI<any>('/onboarding/steps/welcome', { method: 'POST', body: JSON.stringify(data || {}) }),

    saveLinkedInUrl: (linkedinUrl: string) =>
      fetchAPI<any>('/onboarding/steps/linkedin-url', { method: 'POST', body: JSON.stringify({ linkedinUrl }) }),

    uploadResume: (fileInfo: any, parsedData: any) =>
      fetchAPI<any>('/onboarding/steps/resume', { method: 'POST', body: JSON.stringify({ fileInfo, parsedData }) }),

    uploadResumeFile: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      const response = await fetch(`${API_BASE}/onboarding/resume/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload resume');
      }
      return response.json();
    },

    saveGithubUrl: (githubUrl: string) =>
      fetchAPI<any>('/onboarding/steps/github-url', { method: 'POST', body: JSON.stringify({ githubUrl }) }),

    saveGoals: (goals: string[]) =>
      fetchAPI<any>('/onboarding/steps/goals', { method: 'POST', body: JSON.stringify({ goals }) }),

    skipStep: (step: string) =>
      fetchAPI<any>('/onboarding/steps/skip', { method: 'POST', body: JSON.stringify({ step }) }),

    runAnalysis: () =>
      fetchAPI<any>('/onboarding/analysis/run', { method: 'POST' }),

    completeStep: (step: string, data?: any) =>
      fetchAPI<any>(`/onboarding/steps/${step}/complete`, { method: 'POST', body: JSON.stringify(data || {}) }),

    getSummary: () =>
      fetchAPI<any>('/onboarding/summary'),

    resume: () =>
      fetchAPI<any>('/onboarding/resume', { method: 'POST' }),

    markRedirected: () =>
      fetchAPI<any>('/onboarding/redirected', { method: 'POST' }),

    uploadLinkedInPdf: async (file: File): Promise<any> => {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await fetch(`${API_BASE}/onboarding/linkedin-pdf`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Failed to upload LinkedIn PDF');
      }
      return response.json();
    },

    uploadLinkedInPdfData: (fileInfo: any, parsedData: any) =>
      fetchAPI<any>('/onboarding/linkedin-pdf-data', { method: 'POST', body: JSON.stringify({ fileInfo, parsedData }) }),
  },

  career: {
    getGoals: (userId: string) =>
      fetchAPI<any>(`/career/goals?userId=${userId}`),

    updateGoals: (userId: string, updates: any) =>
      fetchAPI<any>('/career/goals', { method: 'PUT', body: JSON.stringify({ userId, updates }) }),

    suggestGoals: (profileData: any) =>
      fetchAPI<any[]>('/career/goals/suggest', { method: 'POST', body: JSON.stringify({ profileData }) }),

    detectStage: (profileData: any) =>
      fetchAPI<any>('/career/stage', { method: 'POST', body: JSON.stringify({ profileData }) }),

    getOpportunityMap: (profileData: any, targetRole?: string) =>
      fetchAPI<any>('/career/opportunity-map', { method: 'POST', body: JSON.stringify({ profileData, targetRole }) }),

    getSkillGaps: (profileData: any) =>
      fetchAPI<any>('/career/skill-gaps', { method: 'POST', body: JSON.stringify({ profileData }) }),

    getContentMap: (goal: string) =>
      fetchAPI<any>('/career/content-map', { method: 'POST', body: JSON.stringify({ goal }) }),

    getBlueprint: (userId: string) =>
      fetchAPI<any>(`/career/blueprint/${userId}`),

    updateBlueprintProgress: (userId: string, milestoneIndex?: number, taskPath?: string) =>
      fetchAPI<any>(`/career/blueprint/${userId}/progress`, { method: 'PUT', body: JSON.stringify({ milestoneIndex, taskPath }) }),

    getAuthorityMap: (userId: string) =>
      fetchAPI<any>(`/career/authority/${userId}`),

    getNetworking: (userId: string) =>
      fetchAPI<any>(`/career/networking/${userId}`),

    getForecast: (userId: string) =>
      fetchAPI<any>(`/career/forecast/${userId}`),

    getMilestones: (userId: string, status?: string) =>
      fetchAPI<any[]>(`/career/milestones/${userId}${status ? `?status=${status}` : ''}`),

    createMilestone: (userId: string, data: any) =>
      fetchAPI<any>('/career/milestones', { method: 'POST', body: JSON.stringify({ userId, ...data }) }),

    updateMilestone: (id: string, updates: any) =>
      fetchAPI<any>(`/career/milestones/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    generateFullReport: (userId: string, profileData: any) =>
      fetchAPI<any>('/career/full-report', { method: 'POST', body: JSON.stringify({ userId, profileData }) }),

    getStatus: (userId: string) =>
      fetchAPI<{
        careerGoal: { exists: boolean; primaryGoal: string | null; targetRole: string | null; version: number; status: string | null };
        careerBlueprint: { exists: boolean; currentPosition: string | null; targetPosition: string | null; progress: number; milestones: number };
        skillGap: { exists: boolean; totalGaps: number; criticalGaps: number; readinessScore: number };
        opportunityForecast: { exists: boolean; avgProbability: number; readinessScore: number };
        authorityMap: { exists: boolean; ownedTopics: number };
        networking: { exists: boolean; totalTargets: number };
        milestones: { total: number };
      }>(`/career/status/${userId}`),
  },

  contentPillars: {
    generateFullReport: (userId: string, profileData: any) =>
      fetchAPI<any>('/content-pillars/full-report', { method: 'POST', body: JSON.stringify({ userId, profileData }) }),

    getPillars: (userId: string) =>
      fetchAPI<any[]>(`/content-pillars?userId=${userId}`),

    updatePillar: (id: string, updates: any) =>
      fetchAPI<any>(`/content-pillars/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    getScores: (userId: string) =>
      fetchAPI<any[]>(`/content-pillars/scores/${userId}`),

    getTopicClusters: (userId: string, pillarId?: string) =>
      fetchAPI<any[]>(`/content-pillars/topics/${userId}${pillarId ? `?pillarId=${pillarId}` : ''}`),

    getAuthorityMap: (userId: string) =>
      fetchAPI<any>(`/content-pillars/authority/${userId}`),

    getDistribution: (userId: string) =>
      fetchAPI<any>(`/content-pillars/distribution/${userId}`),

    getSnapshots: (userId: string, limit?: number) =>
      fetchAPI<any[]>(`/content-pillars/snapshots/${userId}${limit ? `?limit=${limit}` : ''}`),

    getStatus: (userId: string) =>
      fetchAPI<any>(`/content-pillars/status/${userId}`),
  },

  writing: {
    generate: (userId: string, texts: string[], profileId?: string) =>
      fetchAPI<any>('/writing/generate', { method: 'POST', body: JSON.stringify({ userId, texts, profileId }) }),

    getDNA: (userId: string) =>
      fetchAPI<any>(`/writing/dna?userId=${userId}`),

    updateDNA: (userId: string, updates: any) =>
      fetchAPI<any>('/writing/dna', { method: 'PUT', body: JSON.stringify({ userId, updates }) }),

    getSnapshots: (userId: string, limit?: number) =>
      fetchAPI<any[]>(`/writing/snapshots/${userId}${limit ? `?limit=${limit}` : ''}`),

    getHooks: (userId: string) =>
      fetchAPI<{ hooks: any[]; count: number }>(`/writing/hooks/${userId}`),

    getCTAs: (userId: string) =>
      fetchAPI<{ ctas: any[]; count: number }>(`/writing/ctas/${userId}`),

    learn: (userId: string, texts: string[], trigger?: string) =>
      fetchAPI<any>('/writing/learn', { method: 'POST', body: JSON.stringify({ userId, texts, trigger }) }),

    score: (userId: string, content: string, contentId?: string) =>
      fetchAPI<any>('/writing/score', { method: 'POST', body: JSON.stringify({ userId, content, contentId }) }),

    getStatus: (userId: string) =>
      fetchAPI<{ writingDNA: { exists: boolean; version: number; confidence: number; sampleCount: number; totalWords: number; voiceSignature: string | null; communicationStyle: string | null; lastAnalyzed: string | null }; learningHistory: { snapshotCount: number; hasEnoughSamples: boolean }; recentScores: any[] }>(`/writing/status/${userId}`),

    getFullReport: (userId: string) =>
      fetchAPI<any>(`/writing/full-report/${userId}`),

    getLearningHistory: (userId: string, limit?: number) =>
      fetchAPI<any[]>(`/writing/learning/${userId}${limit ? `?limit=${limit}` : ''}`),
  },

  brand: {
    getDNA: (userId: string) =>
      fetchAPI<any>(`/brand/dna?userId=${userId}`),

    generate: (profileId: string, userId: string) =>
      fetchAPI<any>(`/brand/generate/${profileId}`, { method: 'POST', body: JSON.stringify({ userId }) }),

    updateDNA: (userId: string, updates: any) =>
      fetchAPI<any>('/brand/dna', { method: 'PUT', body: JSON.stringify({ userId, updates }) }),

    getVoice: (userId: string) =>
      fetchAPI<any>(`/brand/voice?userId=${userId}`),

    generateVoice: (userId: string, brandDnaId?: string) =>
      fetchAPI<any>('/brand/voice/generate', { method: 'POST', body: JSON.stringify({ userId, brandDnaId }) }),

    getStatus: (userId: string) =>
      fetchAPI<{ brandDna: { exists: boolean; status: string | null; archetype: string | null; lastGenerated: string | null }; voiceProfile: { exists: boolean; status: string | null; sampleCount: number; lastAnalyzed: string | null } }>(`/brand/status/${userId}`),
  },

  contentStrategy: {
    generateFullReport: (userId: string, profileData: any) =>
      fetchAPI<any>('/content-strategy/full-report', { method: 'POST', body: JSON.stringify({ userId, profileData }) }),

    getStrategy: (userId: string) =>
      fetchAPI<any>(`/content-strategy/${userId}`),

    getMonthlyPlans: (userId: string) =>
      fetchAPI<any[]>(`/content-strategy/${userId}/months`),

    getWeeklyThemes: (userId: string, month?: number) =>
      fetchAPI<any[]>(`/content-strategy/${userId}/themes${month ? `?month=${month}` : ''}`),

    getGoals: (userId: string) =>
      fetchAPI<any[]>(`/content-strategy/${userId}/goals`),

    updateGoal: (id: string, updates: any) =>
      fetchAPI<any>(`/content-strategy/goals/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    getAuthorityRoadmap: (userId: string) =>
      fetchAPI<any>(`/content-strategy/${userId}/authority`),

    getNetworkingPlan: (userId: string) =>
      fetchAPI<any>(`/content-strategy/${userId}/networking`),

    getOpportunityPlan: (userId: string) =>
      fetchAPI<any>(`/content-strategy/${userId}/opportunities`),

    getScores: (userId: string) =>
      fetchAPI<any>(`/content-strategy/${userId}/scores`),

    regenerate: (userId: string, signals: any, profileData?: any) =>
      fetchAPI<any>('/content-strategy/regenerate', { method: 'POST', body: JSON.stringify({ userId, signals, profileData }) }),

    getStatus: (userId: string) =>
      fetchAPI<any>(`/content-strategy/${userId}/status`),
  },

  contentOperations: {
    generateFullReport: (userId: string, strategyData: any) =>
      fetchAPI<any>('/content-operations/full-report', { method: 'POST', body: JSON.stringify({ userId, strategyData }) }),

    getCalendar: (userId: string, startDate?: string, endDate?: string, status?: string, pillar?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (status) params.set('status', status);
      if (pillar) params.set('pillar', pillar);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return fetchAPI<any[]>(`/content-operations/calendar/${userId}${qs ? `?${qs}` : ''}`);
    },

    updateCalendarEntry: (id: string, updates: any) =>
      fetchAPI<any>(`/content-operations/calendar/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    batchUpdateCalendar: (updates: any[]) =>
      fetchAPI<any>('/content-operations/calendar/batch', { method: 'POST', body: JSON.stringify({ updates }) }),

    getQueue: (userId: string, stage?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (stage) params.set('stage', stage);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return fetchAPI<any[]>(`/content-operations/queue/${userId}${qs ? `?${qs}` : ''}`);
    },

    advanceQueue: (id: string) =>
      fetchAPI<any>(`/content-operations/queue/${id}/advance`, { method: 'POST' }),

    updateQueueItem: (id: string, updates: any) =>
      fetchAPI<any>(`/content-operations/queue/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    generateDraft: (calendarEntryId: string, profileData?: any) =>
      fetchAPI<any>('/content-operations/draft/generate', { method: 'POST', body: JSON.stringify({ calendarEntryId, profileData }) }),

    getMode: (userId: string) =>
      fetchAPI<any>(`/content-operations/mode/${userId}`),

    updateMode: (userId: string, mode: string, reason?: string) =>
      fetchAPI<any>(`/content-operations/mode/${userId}`, { method: 'PUT', body: JSON.stringify({ mode, reason }) }),

    updateModeConfig: (userId: string, config: any) =>
      fetchAPI<any>(`/content-operations/mode/${userId}/config`, { method: 'PUT', body: JSON.stringify(config) }),

    syncToSheets: (userId: string) =>
      fetchAPI<any>(`/content-operations/sync/sheets/${userId}`, { method: 'POST' }),

    processOpportunity: (userId: string, signals: any) =>
      fetchAPI<any>('/content-operations/opportunity/process', { method: 'POST', body: JSON.stringify({ userId, signals }) }),

    getAnalytics: (userId: string) =>
      fetchAPI<any>(`/content-operations/analytics/${userId}`),

    getSnapshots: (userId: string, limit?: number) =>
      fetchAPI<any[]>(`/content-operations/snapshots/${userId}${limit ? `?limit=${limit}` : ''}`),

    getStatus: (userId: string) =>
      fetchAPI<any>(`/content-operations/status/${userId}`),
  },

  publishing: {
    getLinkedInUrl: () =>
      fetchAPI<{ url: string }>('/publishing/linkedin/connect'),

    getLinkedInStatus: () =>
      fetchAPI<{ connected: boolean; profile?: any; error?: string }>('/publishing/linkedin/status'),

    disconnectLinkedIn: () =>
      fetchAPI<{ disconnected: boolean }>('/publishing/linkedin/disconnect', { method: 'POST' }),

    approveItem: (itemId: string, scheduledAt?: string) =>
      fetchAPI<any>(`/publishing/queue/${itemId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ scheduledAt }),
      }),

    bulkApprove: (itemIds: string[], scheduledAt?: string) =>
      fetchAPI<any>('/publishing/queue/bulk-approve', {
        method: 'POST',
        body: JSON.stringify({ itemIds, scheduledAt }),
      }),

    publishNow: (itemId: string) =>
      fetchAPI<{ success: boolean; linkedinPostId?: string; error?: string }>(
        `/publishing/queue/${itemId}/publish-now`,
        { method: 'POST' }
      ),

    retryFailed: (itemId: string) =>
      fetchAPI<{ success: boolean; error?: string }>(
        `/publishing/queue/${itemId}/retry`,
        { method: 'POST' }
      ),

    getStatus: () =>
      fetchAPI<{
        scheduledCount: number;
        publishedCount: number;
        failedCount: number;
        nextScheduledAt: string | null;
        schedulerRunning: boolean;
      }>('/publishing/publisher/status'),

    triggerPublish: () =>
      fetchAPI<{ queueItems: number; posts: number; published: number }>('/publishing/publisher/trigger', { method: 'POST' }),

    getUpcoming: (userId: string) =>
      fetchAPI<any[]>(`/publishing/upcoming/${userId}`),
  },

  google: {
    getConnectUrl: () =>
      fetchAPI<{ url: string }>('/google/connect'),

    getStatus: () =>
      fetchAPI<{ connected: boolean; email?: string }>('/google/status'),

    disconnect: () =>
      fetchAPI<{ disconnected: boolean }>('/google/disconnect', { method: 'POST' }),

    exportToSheets: (entries?: any[]) =>
      fetchAPI<{ spreadsheetId: string; spreadsheetUrl: string }>(
        '/google/export',
        { method: 'POST', body: JSON.stringify({ entries: entries || [] }) }
      ),
  },

  opportunity: {
    mine: (userId: string, source?: string) =>
      fetchAPI<any>('/opportunity/mine', { method: 'POST', body: JSON.stringify({ userId, source }) }),

    getSignals: (userId: string) =>
      fetchAPI<any[]>(`/opportunity/signals/${userId}`),

    updateSignal: (id: string, updates: any) =>
      fetchAPI<any>(`/opportunity/signals/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    detect: (userId: string) =>
      fetchAPI<any>('/opportunity/detect', { method: 'POST', body: JSON.stringify({ userId }) }),

    getOpportunities: (userId: string) =>
      fetchAPI<any[]>(`/opportunity/opportunities/${userId}`),

    updateOpportunity: (id: string, updates: any) =>
      fetchAPI<any>(`/opportunity/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    getRecommendations: (userId: string) =>
      fetchAPI<any[]>(`/opportunity/recommendations/${userId}`),

    updateRecommendation: (id: string, updates: any) =>
      fetchAPI<any>(`/opportunity/recommendations/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    analyzeGithub: (userId: string) =>
      fetchAPI<any>('/opportunity/analyze/github', { method: 'POST', body: JSON.stringify({ userId }) }),

    analyzeLinkedin: (userId: string) =>
      fetchAPI<any>('/opportunity/analyze/linkedin', { method: 'POST', body: JSON.stringify({ userId }) }),

    analyzePortfolio: (userId: string) =>
      fetchAPI<any>('/opportunity/analyze/portfolio', { method: 'POST', body: JSON.stringify({ userId }) }),

    analyzeResume: (userId: string) =>
      fetchAPI<any>('/opportunity/analyze/resume', { method: 'POST', body: JSON.stringify({ userId }) }),

    analyzeProject: (userId: string, projectData: any) =>
      fetchAPI<any>('/opportunity/analyze/project', { method: 'POST', body: JSON.stringify({ userId, ...projectData }) }),

    analyzeAngles: (userId: string, opportunityId: string) =>
      fetchAPI<any>('/opportunity/analyze/angles', { method: 'POST', body: JSON.stringify({ userId, opportunityId }) }),

    getStatus: (userId: string) =>
      fetchAPI<any>(`/opportunity/status/${userId}`),
  },

  contentGeneration: {
    generate: (input: any) =>
      fetchAPI<any>('/content-generation/generate', { method: 'POST', body: JSON.stringify(input) }),

    regenerate: (postId: string, params: any) =>
      fetchAPI<any>(`/content-generation/regenerate/${postId}`, { method: 'POST', body: JSON.stringify(params) }),

    getPosts: (userId: string, contentType?: string, status?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (contentType) params.set('contentType', contentType);
      if (status) params.set('status', status);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return fetchAPI<any[]>(`/content-generation/posts/${userId}${qs ? `?${qs}` : ''}`);
    },

    getPostDetail: (postId: string) =>
      fetchAPI<any>(`/content-generation/posts/detail/${postId}`),

    updatePost: (postId: string, updates: any) =>
      fetchAPI<any>(`/content-generation/posts/${postId}`, { method: 'PUT', body: JSON.stringify(updates) }),

    deletePost: (postId: string) =>
      fetchAPI<any>(`/content-generation/posts/${postId}`, { method: 'DELETE' }),

    getVariations: (postId: string) =>
      fetchAPI<any[]>(`/content-generation/variations/${postId}`),

    selectVariation: (variationId: string) =>
      fetchAPI<any>(`/content-generation/variations/${variationId}/select`, { method: 'PUT' }),

    generateVariations: (input: any) =>
      fetchAPI<any>('/content-generation/variations/generate', { method: 'POST', body: JSON.stringify(input) }),

    getDrafts: (userId: string, status?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return fetchAPI<any[]>(`/content-generation/drafts/${userId}${qs ? `?${qs}` : ''}`);
    },

    validateVoice: (content: string, voiceProfile: any) =>
      fetchAPI<any>('/content-generation/validate/voice', { method: 'POST', body: JSON.stringify({ content, voiceProfile }) }),

    validateBrand: (content: string, topic: string, brandProfile: any) =>
      fetchAPI<any>('/content-generation/validate/brand', { method: 'POST', body: JSON.stringify({ content, topic, brandProfile }) }),

    evaluateCareer: (input: any) =>
      fetchAPI<any>('/content-generation/evaluate/career', { method: 'POST', body: JSON.stringify(input) }),

    reviewContent: (input: any) =>
      fetchAPI<any>('/content-generation/review', { method: 'POST', body: JSON.stringify(input) }),

    scoreContent: (input: any) =>
      fetchAPI<any>('/content-generation/score', { method: 'POST', body: JSON.stringify(input) }),

    optimizeLinkedIn: (input: any) =>
      fetchAPI<any>('/content-generation/optimize', { method: 'POST', body: JSON.stringify(input) }),

    getStatus: (userId: string) =>
      fetchAPI<any>(`/content-generation/status/${userId}`),
  },

  aiManager: {
    chat: (userId: string, message: string, sessionId?: string) =>
      fetchAPI<any>('/ai-manager/chat', { method: 'POST', body: JSON.stringify({ userId, message, sessionId }) }),

    getSessions: (userId: string) =>
      fetchAPI<any[]>(`/ai-manager/sessions/${userId}`),

    createSession: (userId: string) =>
      fetchAPI<any>('/ai-manager/sessions', { method: 'POST', body: JSON.stringify({ userId }) }),

    updateSession: (id: string, updates: any) =>
      fetchAPI<any>(`/ai-manager/sessions/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    getHistory: (sessionId: string, limit?: number) =>
      fetchAPI<any[]>(`/ai-manager/history/${sessionId}${limit ? `?limit=${limit}` : ''}`),

    getRecommendations: (userId: string, category?: string, status?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return fetchAPI<any[]>(`/ai-manager/recommendations/${userId}${qs ? `?${qs}` : ''}`);
    },

    updateRecommendation: (id: string, updates: any) =>
      fetchAPI<any>(`/ai-manager/recommendations/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),

    getProactive: (userId: string) =>
      fetchAPI<any[]>(`/ai-manager/proactive/${userId}`),

    getActions: (userId: string, status?: string, limit?: number) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return fetchAPI<any[]>(`/ai-manager/actions/${userId}${qs ? `?${qs}` : ''}`);
    },

    executeAction: (actionId: string, approvedBy?: string) =>
      fetchAPI<any>(`/ai-manager/actions/${actionId}/execute`, { method: 'POST', body: JSON.stringify({ approvedBy }) }),

    approveAction: (actionId: string, userId: string) =>
      fetchAPI<any>(`/ai-manager/actions/${actionId}/approve`, { method: 'POST', body: JSON.stringify({ userId }) }),

    rejectAction: (actionId: string, reason?: string) =>
      fetchAPI<any>(`/ai-manager/actions/${actionId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),

    getPreferences: (userId: string) =>
      fetchAPI<any>(`/ai-manager/preferences/${userId}`),

    updatePreferences: (userId: string, prefs: any) =>
      fetchAPI<any>(`/ai-manager/preferences/${userId}`, { method: 'PUT', body: JSON.stringify(prefs) }),

    getContext: (userId: string) =>
      fetchAPI<any>(`/ai-manager/context/${userId}`),

    getTasks: (userId: string) =>
      fetchAPI<any[]>(`/ai-manager/tasks/${userId}`),

    getStatus: (userId: string) =>
      fetchAPI<any>(`/ai-manager/status/${userId}`),
  },

  aiCoach: {
    getContext: () =>
      fetchAPI<any>('/ai-coach/context'),

    chat: (message: string, sessionId?: string) =>
      fetchAPI<any>('/ai-coach/chat', { method: 'POST', body: JSON.stringify({ message, sessionId }) }),

    getSessions: () =>
      fetchAPI<any[]>('/ai-coach/sessions'),

    createSession: () =>
      fetchAPI<any>('/ai-coach/sessions', { method: 'POST' }),

    getHistory: (sessionId: string) =>
      fetchAPI<any[]>(`/ai-coach/history/${sessionId}`),
  },

  analytics: {
    ingest: (data: any) =>
      fetchAPI<any>('/analytics/ingest', { method: 'POST', body: JSON.stringify(data) }),

    analyze: (userId: string) =>
      fetchAPI<any>('/analytics/analyze', { method: 'POST', body: JSON.stringify({ userId }) }),

    getPerformance: (userId: string) =>
      fetchAPI<any>(`/analytics/performance/${userId}`),

    getContentAnalysis: (userId: string) =>
      fetchAPI<any>(`/analytics/content/${userId}`),

    getPostPerformance: (postId: string, userId: string) =>
      fetchAPI<any>(`/analytics/content/post/${postId}?userId=${userId}`),

    getAudience: (userId: string) =>
      fetchAPI<any>(`/analytics/audience/${userId}`),

    getPillars: (userId: string) =>
      fetchAPI<any>(`/analytics/pillars/${userId}`),

    getStrategy: (userId: string) =>
      fetchAPI<any>(`/analytics/strategy/${userId}`),

    getOpportunities: (userId: string) =>
      fetchAPI<any>(`/analytics/opportunities/${userId}`),

    getCareerImpact: (userId: string) =>
      fetchAPI<any>(`/analytics/career/${userId}`),

    getForecasts: (userId: string, period?: string) =>
      fetchAPI<any>(`/analytics/forecasts/${userId}${period ? `?period=${period}` : ''}`),

    getRecommendations: (userId: string) =>
      fetchAPI<any>(`/analytics/recommendations/${userId}`),

    getReports: (userId: string, type?: string) =>
      fetchAPI<any>(`/analytics/reports/${userId}${type ? `?type=${type}` : ''}`),

    optimize: (userId: string) =>
      fetchAPI<any>('/analytics/optimize', { method: 'POST', body: JSON.stringify({ userId }) }),

    decide: (data: any) =>
      fetchAPI<any>('/analytics/decide', { method: 'POST', body: JSON.stringify(data) }),

    getDashboard: (userId: string) =>
      fetchAPI<any>(`/analytics/dashboard/${userId}`),

    triggerEvent: (type: string, userId: string, data?: any) =>
      fetchAPI<any>('/analytics/events', { method: 'POST', body: JSON.stringify({ type, userId, data }) }),

    getTrends: (userId: string, metric?: string, days?: number) => {
      const params = new URLSearchParams();
      if (metric) params.set('metric', metric);
      if (days) params.set('days', String(days));
      const qs = params.toString();
      return fetchAPI<any>(`/analytics/trends/${userId}${qs ? `?${qs}` : ''}`);
    },

    getStatus: (userId: string) =>
      fetchAPI<any>(`/analytics/status/${userId}`),
  },

  health: () =>
    fetchAPI<{ status: string; timestamp: string; version: string }>('/health'),

  report: {
    get: () =>
      fetchAPI<any>('/report/report'),

    generate: () =>
      fetchAPI<any>('/report/generate', { method: 'POST' }),

    getSection: (section: string) =>
      fetchAPI<any>(`/report/section/${section}`),
  },

  dashboard: {
    get: () =>
      fetchAPI<any>('/dashboard'),
  },

  contentIntelligence: {
    get: () =>
      fetchAPI<any>('/content-intelligence'),
  },

  contentChallenge: {
    get: () =>
      fetchAPI<any>('/content-challenge'),
    getStats: () =>
      fetchAPI<any>('/content-challenge/stats'),
    start: (data: { topics: string[]; postsPerWeek: number; postingDays: string[]; postingTime: string; timezone?: string; startDate?: string; reviewMode: boolean }) =>
      fetchAPI<any>('/content-challenge/start', { method: 'POST', body: JSON.stringify(data) }),
    generateToday: () =>
      fetchAPI<any>('/content-challenge/generate-today', { method: 'POST' }),
    generateBatch: (days: number) =>
      fetchAPI<any>('/content-challenge/generate-batch', { method: 'POST', body: JSON.stringify({ days }) }),
    pause: () =>
      fetchAPI<any>('/content-challenge/pause', { method: 'POST' }),
    resume: () =>
      fetchAPI<any>('/content-challenge/resume', { method: 'POST' }),
    delete: () =>
      fetchAPI<any>('/content-challenge', { method: 'DELETE' }),
  },

  contentAnalytics: {
    get: () =>
      fetchAPI<any>('/content-analytics'),
  },
};
