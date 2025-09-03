import { Amplify, Auth } from 'aws-amplify';
import { AppConfig, User } from '../types';

// Configure Amplify
export const configureAuth = (config: AppConfig) => {
  Amplify.configure({
    Auth: {
      region: config.region,
      userPoolId: config.userPoolId,
      userPoolWebClientId: config.userPoolClientId,
      mandatorySignIn: true,
      authenticationFlowType: 'USER_SRP_AUTH',
    },
  });
};

export class AuthService {
  /**
   * Sign in user
   */
  async signIn(email: string, password: string): Promise<any> {
    try {
      const user = await Auth.signIn(email, password);
      return user;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  /**
   * Sign up new user
   */
  async signUp(email: string, password: string, name?: string): Promise<any> {
    try {
      const result = await Auth.signUp({
        username: email,
        password,
        attributes: {
          email,
          ...(name && { name }),
        },
      });
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  /**
   * Confirm sign up with verification code
   */
  async confirmSignUp(email: string, code: string): Promise<any> {
    try {
      const result = await Auth.confirmSignUp(email, code);
      return result;
    } catch (error) {
      console.error('Confirm sign up error:', error);
      throw error;
    }
  }

  /**
   * Resend confirmation code
   */
  async resendConfirmationCode(email: string): Promise<any> {
    try {
      const result = await Auth.resendSignUp(email);
      return result;
    } catch (error) {
      console.error('Resend confirmation code error:', error);
      throw error;
    }
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      await Auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const cognitoUser = await Auth.currentAuthenticatedUser();
      const attributes = await Auth.userAttributes(cognitoUser);
      
      const user: User = {
        id: cognitoUser.username,
        email: attributes.find(attr => attr.Name === 'email')?.Value || '',
        name: attributes.find(attr => attr.Name === 'name')?.Value,
        attributes: attributes.reduce((acc, attr) => {
          acc[attr.Name] = attr.Value;
          return acc;
        }, {} as Record<string, any>),
      };

      return user;
    } catch (error) {
      console.log('No authenticated user');
      return null;
    }
  }

  /**
   * Get current session
   */
  async getCurrentSession(): Promise<any> {
    try {
      const session = await Auth.currentSession();
      return session;
    } catch (error) {
      console.log('No valid session');
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      await Auth.currentAuthenticatedUser();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Forgot password
   */
  async forgotPassword(email: string): Promise<any> {
    try {
      const result = await Auth.forgotPassword(email);
      return result;
    } catch (error) {
      console.error('Forgot password error:', error);
      throw error;
    }
  }

  /**
   * Confirm forgot password with new password
   */
  async forgotPasswordSubmit(
    email: string, 
    code: string, 
    newPassword: string
  ): Promise<any> {
    try {
      const result = await Auth.forgotPasswordSubmit(email, code, newPassword);
      return result;
    } catch (error) {
      console.error('Forgot password submit error:', error);
      throw error;
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const result = await Auth.changePassword(user, oldPassword, newPassword);
      return result;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  /**
   * Update user attributes
   */
  async updateUserAttributes(attributes: Record<string, string>): Promise<any> {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const result = await Auth.updateUserAttributes(user, attributes);
      return result;
    } catch (error) {
      console.error('Update user attributes error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
