import type { Metadata } from 'next'
import { toLocale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'
import { NewPasswordForm } from '@/components/NewPasswordForm'
import { PageHead } from '@/components/PageHead'

/* Depends entirely on who is asking, and must never be cached or prerendered.
   It is also NOINDEX: a password form in search results is both useless to
   anybody who arrives from there and an invitation to phishing screenshots. */
export const dynamic = 'force-dynamic'

export async function generateMetadata(
  { params }: { params: Promise<{ lang: string }> },
): Promise<Metadata> {
  const t = getDictionary(toLocale((await params).lang))
  return { title: t.auth.chooseNewPassword, robots: { index: false, follow: false } }
}

export default async function ResetPasswordPage(
  { params }: { params: Promise<{ lang: string }> },
) {
  const lang = toLocale((await params).lang)
  const t = getDictionary(lang)

  return (
    <>
      {/* No `path`, so no breadcrumb: this page carries noindex, and a
          breadcrumb for a page nobody should reach is noise in the graph. */}
      <PageHead lang={lang} icon="shield" eyebrow={t.auth.memberSignIn}
                title={t.auth.chooseNewPassword} lede={t.auth.chooseNewPasswordLede} />
      <section className="section">
        <div className="container">
          <div className="u-measure-center">
            <NewPasswordForm />
          </div>
        </div>
      </section>
    </>
  )
}
