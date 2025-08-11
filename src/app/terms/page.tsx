'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TermsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-grid pointer-events-none opacity-[0.25]" />
      <div className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-primary/30 via-primary/0 to-accent/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 h-[460px] w-[460px] rounded-full bg-gradient-to-tr from-accent/25 via-accent/0 to-primary/20 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring', stiffness: 120, damping: 18 }}
        className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 md:py-20"
      >
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Effective date: {new Date().toLocaleDateString()}</p>
        </div>

        <Card className="bg-card/60 backdrop-blur-xl shadow-xl shadow-black/10 border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Agreement to Terms</CardTitle>
            <CardDescription>By accessing or using Impostor, you agree to these Terms.</CardDescription>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none prose-p:leading-relaxed prose-li:leading-relaxed">
            <section className="space-y-4 text-sm">
              <p>
                These Terms of Service (&quot;Terms&quot;) govern your use of the Impostor game and related services (&quot;Service&quot;). By accessing
                or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
              </p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">1. Eligibility</h2>
              <p>You must be at least 13 years old to use the Service. If you are under the age of majority, you represent that you have permission from a parent or legal guardian.</p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">2. Accounts and Security</h2>
              <p>
                You may be required to create a display name to access certain features. You are responsible for the accuracy of the information you provide and for maintaining the security of your device and connection.
              </p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">3. Acceptable Use</h2>
              <ul className="list-disc pl-6">
                <li>Do not harass, bully, or threaten other users.</li>
                <li>Do not attempt to cheat, hack, or disrupt gameplay or network operations.</li>
                <li>Do not upload, share, or transmit content that is illegal or infringing.</li>
                <li>Comply with all applicable laws and regulations.</li>
              </ul>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">4. Non-Linking Data Storage</h2>
              <p>
                We store only the minimal data required to operate the Service. Game room codes, game state, and ephemeral identifiers may be stored on our servers to enable real-time play. We do not directly link this data to real-world identities. Client-side local storage may be used to retain session tokens for your convenience.
              </p>
              <p>
                We do not sell personal data. Aggregated, anonymized analytics may be used to improve the Service. For more details about data handling, refer to our Privacy Overview within this document.
              </p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">5. User Content</h2>
              <p>You are responsible for any content you submit, including names, messages, and gameplay hints. You grant us a non-exclusive, worldwide, royalty-free license to use, display, and transmit such content solely for providing the Service.</p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">6. Intellectual Property</h2>
              <p>
                All rights, title, and interest in and to the Service (excluding user content) are owned by us or our licensors. These Terms do not grant you any rights to use trademarks, logos, or other proprietary marks.
              </p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">7. Third-Party Services</h2>
              <p>
                The Service may integrate third-party services (e.g., hosting, real-time communications). We are not responsible for third-party content, availability, or policies.
              </p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">8. Disclaimers</h2>
              <p>
                THE SERVICE IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
              </p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">9. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL WE BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOOD-WILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM (A) YOUR ACCESS TO OR USE OF OR INABILITY TO ACCESS OR USE THE SERVICE; (B) ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE SERVICE; OR (C) UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.
              </p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">10. Indemnification</h2>
              <p>
                You agree to defend, indemnify, and hold us harmless from and against any and all claims, liabilities, damages, losses, and expenses, including reasonable attorney&apos;s fees, arising out of or in any way connected with your access to or use of the Service or your violation of these Terms.
              </p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">11. Termination</h2>
              <p>We may suspend or terminate your access to the Service at any time, with or without notice, for conduct that we believe violates these Terms or is otherwise harmful.</p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">12. Modifications to the Service and Terms</h2>
              <p>We may modify or discontinue the Service at any time. We may also update these Terms occasionally. Continued use of the Service after changes indicates acceptance.</p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">13. Governing Law</h2>
              <p>These Terms shall be governed by and construed in accordance with the laws of your jurisdiction of residence, without regard to conflicts of law principles.</p>
            </section>
            <section className="mt-6 space-y-3 text-sm">
              <h2 className="text-base font-semibold">14. Contact</h2>
              <p>If you have questions about these Terms, contact the developer/maintainer via the repository or app listing where you obtained the Service.</p>
            </section>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button asChild variant="default" size="lg" className="h-11">
            <Link href="/">Return to game</Link>
          </Button>
        </div>
      </motion.div>
    </div>
  )
}


