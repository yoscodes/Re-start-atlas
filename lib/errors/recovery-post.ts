/**
 * 回復投稿関連のエラーコード定義とUI処理
 */

// エラーコード定義
export const RECOVERY_POST_ERROR_CODES = {
  // バリデーションエラー（P1000番台）
  P1001: {
    code: 'P1001',
    message: 'ステップは最低1つ必要です',
    userMessage: '回復ステップを最低1つ入力してください',
    severity: 'error' as const,
    field: 'steps' as const,
  },
  P1002: {
    code: 'P1002',
    message: 'ステップ順序が不正です',
    userMessage: 'ステップの順序が正しくありません。1から順番に番号を振ってください',
    severity: 'error' as const,
    field: 'steps' as const,
  },
  // 権限エラー（P2000番台）
  P2001: {
    code: 'P2001',
    message: '投稿が見つからないか、編集権限がありません',
    userMessage: 'この投稿を編集する権限がありません',
    severity: 'error' as const,
    field: null,
  },
  // 競合エラー（P3000番台）
  P3001: {
    code: 'P3001',
    message: '投稿が他のユーザーによって更新されました',
    userMessage: '投稿が他のユーザーによって更新されました。最新の状態を確認してください。',
    severity: 'warning' as const,
    field: null,
  },
} as const

export type RecoveryPostErrorCode = keyof typeof RECOVERY_POST_ERROR_CODES

export type ErrorSeverity = 'error' | 'warning' | 'info'

export interface ErrorInfo {
  code: RecoveryPostErrorCode
  message: string
  userMessage: string
  severity: ErrorSeverity
  field: 'steps' | 'title' | 'summary' | 'currentStatus' | null
}

/**
 * エラーコードからエラー情報を取得
 */
export function getErrorInfo(errorCode: string | undefined): ErrorInfo | null {
  if (!errorCode || !(errorCode in RECOVERY_POST_ERROR_CODES)) {
    return null
  }
  return RECOVERY_POST_ERROR_CODES[errorCode as RecoveryPostErrorCode]
}

/**
 * エラーメッセージを取得（ユーザー向け）
 */
export function getUserErrorMessage(
  error: { code?: string; message?: string } | string | null | undefined
): string {
  if (!error) {
    return '予期しないエラーが発生しました'
  }

  // 文字列の場合はそのまま返す
  if (typeof error === 'string') {
    return error
  }

  // エラーコードがある場合は、ユーザー向けメッセージを返す
  if (error.code) {
    const errorInfo = getErrorInfo(error.code)
    if (errorInfo) {
      return errorInfo.userMessage
    }
  }

  // エラーメッセージがある場合はそれを返す
  if (error.message) {
    return error.message
  }

  return '予期しないエラーが発生しました'
}

/**
 * エラーの重大度を取得
 */
export function getErrorSeverity(errorCode: string | undefined): ErrorSeverity {
  const errorInfo = getErrorInfo(errorCode)
  return errorInfo?.severity || 'error'
}

/**
 * エラーが特定のフィールドに関連しているかチェック
 */
export function getErrorField(errorCode: string | undefined): ErrorInfo['field'] {
  const errorInfo = getErrorInfo(errorCode)
  return errorInfo?.field || null
}

/**
 * エラーコードがバリデーションエラーかチェック
 */
export function isValidationError(errorCode: string | undefined): boolean {
  return errorCode?.startsWith('P1') || false
}

/**
 * エラーコードが権限エラーかチェック
 */
export function isPermissionError(errorCode: string | undefined): boolean {
  return errorCode?.startsWith('P2') || false
}

/**
 * エラーコードが競合エラーかチェック
 */
export function isConflictError(errorCode: string | undefined): boolean {
  return errorCode?.startsWith('P3') || false
}
