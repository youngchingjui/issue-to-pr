export interface AuthenticationPort {
  /**
   * Get an access token for the current session
   */
  getAccessToken(): Promise<string | null>

  /**
   * Get an installation token for a repository
   */
  getInstallationToken(owner: string, repo: string): Promise<string>

  /**
   * Check if the current user has push permissions for a repository
   */
  checkPushPermissions(repoFullName: string): Promise<boolean>

  /**
   * Check if the current user has permission to create pull requests
   */
  checkCreatePRPermissions(repoFullName: string): Promise<boolean>
}
