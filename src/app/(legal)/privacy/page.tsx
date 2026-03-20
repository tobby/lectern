import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Lectern Privacy Policy — how we collect, use, and protect your personal information.",
};

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="!text-slate-400 !text-xs">Last updated: March 20, 2026</p>

      <p>
        This Privacy Policy describes how Lectern (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) collects,
        uses, stores, and protects your personal information when you use our AI-powered study
        platform (&quot;Service&quot;). We are committed to safeguarding your privacy and being
        transparent about our data practices.
      </p>

      <h2>1. Information We Collect</h2>

      <p><strong>Account Information</strong></p>
      <p>
        When you create an account, we collect your full name and email address. If you sign in
        with Google, we also receive your Google account ID and profile picture URL from Google.
      </p>

      <p><strong>Study Data</strong></p>
      <p>
        When you use the Service, we collect and store:
      </p>
      <ul>
        <li>Chat messages you send to the AI tutor and the AI&apos;s responses</li>
        <li>Your quiz answers and progress through lecture materials</li>
        <li>Course enrollment records</li>
      </ul>

      <p><strong>Uploaded Materials</strong></p>
      <p>
        Course administrators may upload lecture materials (PDFs, Word documents) to generate
        study aids. These files are stored securely and processed by our AI to produce
        lecture content. Students do not upload materials directly.
      </p>

      <p><strong>Payment Information</strong></p>
      <p>
        When you purchase message packs, your payment is processed by Paystack. We do not
        store your credit card number, bank account details, or other payment credentials.
        We receive only transaction confirmation data (amount, status, reference ID) from
        Paystack.
      </p>

      <p><strong>Technical Information</strong></p>
      <p>
        We automatically collect your IP address for rate limiting and security purposes.
        We use essential cookies (httpOnly, secure) to manage your authentication session.
        We do not use tracking cookies or third-party analytics.
      </p>

      <h2>2. How We Use Your Information</h2>
      <p>We use your personal information to:</p>
      <ul>
        <li>Create and manage your account</li>
        <li>Provide the study platform and its features (lectures, quizzes, AI chat)</li>
        <li>Process payments for message pack purchases</li>
        <li>Generate AI-powered study aids from uploaded course materials</li>
        <li>Maintain chat history so you can continue conversations across sessions</li>
        <li>Track your study progress within courses</li>
        <li>Enforce rate limits and prevent abuse</li>
        <li>Send essential communications (email verification, password resets)</li>
        <li>Comply with legal obligations</li>
      </ul>
      <p>
        We do not sell your personal information. We do not use your data for advertising.
        We do not build profiles for targeted marketing.
      </p>

      <h2>3. AI Processing</h2>
      <p>
        To provide AI-generated study aids and chat responses, we send relevant course content
        and your chat messages to Anthropic (the company behind Claude AI) for processing.
        This data is sent via Anthropic&apos;s API and is subject to{" "}
        <a href="https://www.anthropic.com/policies" target="_blank" rel="noopener noreferrer">
          Anthropic&apos;s usage policies
        </a>. Anthropic does not use API-submitted data to train their models.
      </p>
      <p>
        We include only the minimum necessary context in AI requests — your chat messages
        and relevant sections of course content. We do not send your name, email, or other
        personal identifiers to Anthropic.
      </p>

      <h2>4. Third-Party Services</h2>
      <p>We share data with the following third-party services, strictly as needed to operate the platform:</p>
      <ul>
        <li>
          <strong>Google</strong> — If you use Google Sign-In, Google provides us with your
          name, email, and profile picture. Governed by{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            Google&apos;s Privacy Policy
          </a>.
        </li>
        <li>
          <strong>Anthropic (Claude AI)</strong> — Course content and chat messages are
          processed to generate study aids and chat responses. Anthropic does not retain
          API data for model training.
        </li>
        <li>
          <strong>Cloudflare R2</strong> — Uploaded course materials are stored securely
          in Cloudflare&apos;s object storage infrastructure.
        </li>
        <li>
          <strong>Paystack</strong> — Payment processing for message pack purchases. We
          do not store your payment credentials. Governed by{" "}
          <a href="https://paystack.com/privacy" target="_blank" rel="noopener noreferrer">
            Paystack&apos;s Privacy Policy
          </a>.
        </li>
      </ul>

      <h2>5. Data Storage and Security</h2>
      <p>
        Your data is stored in a PostgreSQL database with encrypted connections. Passwords are
        hashed using bcrypt with a cost factor of 12 — we never store plaintext passwords.
        Authentication tokens are hashed before storage. All data in transit is encrypted
        using TLS/HTTPS.
      </p>
      <p>
        Uploaded files are stored in Cloudflare R2 with access restricted to authorized
        platform operations. We implement rate limiting, input validation, and other security
        measures to protect against unauthorized access.
      </p>

      <h2>6. Data Retention</h2>
      <ul>
        <li><strong>Account data</strong> is retained as long as your account is active.</li>
        <li><strong>Chat history</strong> is retained for the duration of your enrollment in a course.</li>
        <li><strong>Study progress</strong> is retained as long as your account is active.</li>
        <li><strong>Uploaded materials</strong> are retained as long as the associated course is active on the platform.</li>
        <li><strong>Payment records</strong> are retained as required by applicable financial regulations.</li>
      </ul>
      <p>
        When you delete your account, we will delete or anonymize your personal data within
        30 days, except where retention is required by law.
      </p>

      <h2>7. Your Rights</h2>
      <p>Depending on your jurisdiction, you may have the right to:</p>
      <ul>
        <li><strong>Access</strong> the personal information we hold about you</li>
        <li><strong>Correct</strong> inaccurate or incomplete personal information</li>
        <li><strong>Delete</strong> your account and associated personal data</li>
        <li><strong>Export</strong> your data in a portable format</li>
        <li><strong>Object</strong> to certain processing of your personal information</li>
      </ul>
      <p>
        To exercise any of these rights, contact us at{" "}
        <a href="mailto:privacy@lectern.academy">privacy@lectern.academy</a>. We will respond
        within 30 days.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Lectern uses only essential cookies required for the Service to function:
      </p>
      <ul>
        <li><strong>access_token</strong> — An httpOnly, secure cookie containing your authentication token. Expires after 15 minutes.</li>
        <li><strong>refresh_token</strong> — An httpOnly, secure cookie used to refresh your session. Expires after 7 days.</li>
      </ul>
      <p>
        We do not use advertising cookies, tracking pixels, or third-party analytics cookies.
        Because we only use strictly necessary cookies, no cookie consent banner is required
        under most privacy regulations.
      </p>

      <h2>9. Children&apos;s Privacy</h2>
      <p>
        Lectern is not intended for use by children under the age of 16. We do not knowingly
        collect personal information from children under 16. If we learn that we have collected
        data from a child under 16, we will promptly delete it. If you believe a child under
        16 has provided us with personal information, please contact us at{" "}
        <a href="mailto:privacy@lectern.academy">privacy@lectern.academy</a>.
      </p>

      <h2>10. International Data Transfers</h2>
      <p>
        Your data may be processed in countries other than your own, including wherever our
        third-party service providers operate. We ensure that appropriate safeguards are in
        place to protect your data in accordance with this Privacy Policy and applicable law.
      </p>

      <h2>11. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material
        changes by posting the updated policy on this page and updating the &quot;Last updated&quot;
        date. Your continued use of the Service after changes are posted constitutes your
        acceptance of the revised policy.
      </p>

      <h2>12. Contact</h2>
      <p>
        If you have questions or concerns about this Privacy Policy or our data practices,
        please contact us at{" "}
        <a href="mailto:privacy@lectern.academy">privacy@lectern.academy</a>.
      </p>
    </>
  );
}
