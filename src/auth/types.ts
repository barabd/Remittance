export type AuthUserProfile = {
  id: string
  username: string
  fullName: string
  role: string
  branch: string
  realm: string
  rights: string[]
  financialTxnLimitBdt: number
  hoFundingLimitBdt: number
}

export type LoginResponse = {
  accessToken: string
  tokenType: string
  expiresInMs: number
  user: AuthUserProfile
}
