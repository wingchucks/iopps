import { descriptionSnippet } from "@/lib/description-snippet";

type Props = {
  description: string;
  externalUrl?: string;
  externalApplyUrl?: string;
  applicationUrl?: string;
};

export default function JobDescription({ description, externalUrl, externalApplyUrl, applicationUrl }: Props) {
  const source = [externalUrl, externalApplyUrl, applicationUrl].find(value => {
    if (!value) return false;
    try {
      const url = new URL(value);
      return (url.protocol === "https:" || url.protocol === "http:") && !url.username && !url.password;
    } catch {
      return false;
    }
  });

  return (
    <>
      <h3 className="text-lg font-bold text-text mb-2">About This Role</h3>
      {description.length > 600 ? (
        <details className="group mb-6">
          <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal">
            <span data-description-preview className="block text-base text-text-sec leading-relaxed whitespace-pre-line group-open:hidden">{descriptionSnippet(description, 600)}</span>
            <span className="block min-h-11 py-3 text-sm font-semibold text-teal"><span className="group-open:hidden">Show full description</span><span className="hidden group-open:inline">Show less</span></span>
          </summary>
          <p className="journey-role-description text-base text-text-sec leading-relaxed whitespace-pre-line">{description}</p>
        </details>
      ) : (
        <p className="journey-role-description text-base text-text-sec leading-relaxed mb-6 whitespace-pre-line">{description}</p>
      )}
      {source && (
        <div className="mb-6">
          <p className="text-sm text-text-sec mb-2">
            The description supplied to IOPPS may be an excerpt. Check the original posting for full details.
          </p>
          <a href={source} target="_blank" rel="noopener noreferrer" className="text-sm text-teal underline underline-offset-4">
            Read full details at source <span className="text-text-sec">(opens in a new tab)</span>
          </a>
        </div>
      )}
    </>
  );
}
