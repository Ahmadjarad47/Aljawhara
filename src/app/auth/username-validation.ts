export const USERNAME_PATTERN = /^[\p{L}\p{M}\p{Nd}._@+\-]+(?: [\p{L}\p{M}\p{Nd}._@+\-]+)*(?![\s\S])/u;

export function usernameErrorKey(code?: string): 'usernameInvalid' | 'usernameTaken' | undefined {
  if (code === 'InvalidUserName') return 'usernameInvalid';
  if (code === 'DuplicateUserName') return 'usernameTaken';
  return undefined;
}
