import { Router, Request, Response } from 'express';
import pino from 'pino';
import { User } from '../models/identity/User';
import { PasswordReset } from '../models/auth/PasswordReset';
import { authService } from '../services/auth/AuthService';
import { authenticateToken, optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const logger = pino();

export function createAuthRouter(): Router {
  const router = Router();

  router.post('/signup', async (req: Request, res: Response) => {
    try {
      const { fullName, email, password } = req.body;

      if (!fullName || fullName.trim().length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      if (!password || password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain an uppercase letter' });
      }
      if (!/[a-z]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain a lowercase letter' });
      }
      if (!/[0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain a number' });
      }
      if (!/[^A-Za-z0-9]/.test(password)) {
        return res.status(400).json({ error: 'Password must contain a special character' });
      }

      const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }

      const passwordHash = await authService.hashPassword(password);

      const user = await User.create({
        email: email.toLowerCase().trim(),
        passwordHash,
        fullName: fullName.trim(),
        lastActiveAt: new Date(),
      });

      const token = authService.generateToken(user._id.toString(), user.email);

      res.cookie('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(201).json({
        user: authService.sanitizeUser(user),
        message: 'Account created successfully',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Signup failed');
      res.status(500).json({ error: 'Failed to create account' });
    }
  });

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValid = await authService.verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      user.lastActiveAt = new Date();
      await user.save();

      const token = authService.generateToken(user._id.toString(), user.email);

      res.cookie('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.json({
        user: authService.sanitizeUser(user),
        message: 'Signed in successfully',
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Login failed');
      res.status(500).json({ error: 'Failed to sign in' });
    }
  });

  router.post('/logout', (_req: Request, res: Response) => {
    res.clearCookie('session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    res.json({ message: 'Signed out successfully' });
  });

  router.get('/me', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: authService.sanitizeUser(user) });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get current user');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await User.findOne({ email: email.toLowerCase().trim() });
      if (!user) {
        return res.json({ message: 'If an account exists, a reset link has been sent' });
      }

      const token = authService.generateResetToken();
      await PasswordReset.create({
        email: email.toLowerCase().trim(),
        token,
        expiresAt: authService.getResetTokenExpiry(),
      });

      logger.info({ email }, 'Password reset token generated');
      res.json({ message: 'If an account exists, a reset link has been sent' });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Forgot password failed');
      res.status(500).json({ error: 'Failed to process request' });
    }
  });

  router.post('/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }

      const resetDoc = await PasswordReset.findOne({ token, usedAt: null });
      if (!resetDoc) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }
      if (new Date() > resetDoc.expiresAt) {
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      const passwordHash = await authService.hashPassword(password);
      await User.findOneAndUpdate(
        { email: resetDoc.email },
        { passwordHash, lastActiveAt: new Date() }
      );

      resetDoc.usedAt = new Date();
      await resetDoc.save();

      res.json({ message: 'Password has been reset successfully' });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Reset password failed');
      res.status(500).json({ error: 'Failed to reset password' });
    }
  });

  return router;
}
