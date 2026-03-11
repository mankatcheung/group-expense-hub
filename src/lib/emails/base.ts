export interface TemplateVariables {
  [key: string]: string;
}

export const baseTemplate = ({
  title,
  body,
  cta,
  ctaUrl,
}: {
  title: string;
  body: string;
  cta?: string;
  ctaUrl?: string;
}) => {
  const ctaHtml =
    cta && ctaUrl
      ? `
      <a href="${ctaUrl}" style="display: inline-block; background: #16553b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">${cta}</a>
    `
      : '';

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>${title}</h1>
      ${body}
      ${ctaHtml}
      <p style="color: #888; font-size: 12px; margin-top: 24px;">If you didn't request this, please ignore this email.</p>
    </div>
  `;
};

export const footerText = 'If you didn\'t request this, please ignore this email.';
