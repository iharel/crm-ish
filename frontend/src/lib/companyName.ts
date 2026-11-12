/** companyName — guess a company name from an email address (mirrors the backend's domain-based naming). */

const FREE_MAIL = /^(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|me|aol|proton|protonmail|walla)\./

/** The domain of an email address, or '' when it is a free-mail one (gmail.com, outlook.com…) or missing. */
export function companyDomainOf(email: string | null | undefined): string {
  const domain = email?.split('@')[1]?.trim().toLowerCase() ?? ''
  return domain && !FREE_MAIL.test(`${domain}.`) ? domain : ''
}

/** "dana@acme-labs.com" → "Acme Labs". Empty for free-mail or missing addresses. */
export function suggestCompanyName(email: string | null | undefined): string {
  const domain = companyDomainOf(email)
  return domain ? domain.split('.')[0].replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : ''
}
