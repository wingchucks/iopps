export function generateOrganizationSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "IOPPS",
        alternateName: "Indigenous Opportunities & Partnerships Platform",
        url: "https://iopps.ca",
        logo: "https://iopps.ca/logo.png",
        description:
            "Empowering Indigenous success across Canada through jobs, conferences, scholarships, pow wows, Indigenous-owned businesses, and live streams.",
        foundingDate: "2024",
        address: {
            "@type": "PostalAddress",
            addressCountry: "CA",
        },
        sameAs: [
            "https://twitter.com/ioppsca",
            "https://facebook.com/ioppsca",
            "https://instagram.com/ioppsca",
        ],
        contactPoint: {
            "@type": "ContactPoint",
            email: "nathan.arias@iopps.ca",
            contactType: "Customer Service",
            areaServed: "CA",
        },
    };
}

export function generateWebsiteSchema() {
    return {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "IOPPS",
        url: "https://iopps.ca",
        description:
            "Canada's platform for Indigenous employment, scholarships, conferences, and business opportunities.",
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: "https://iopps.ca/jobs?search={search_term_string}",
            },
            "query-input": "required name=search_term_string",
        },
    };
}

export function generateJobPostingSchema(job: {
    title: string;
    description: string;
    employerName?: string;
    location: string;
    employmentType: string;
    salaryRange?: string;
    closingDate?: string | Date;
}) {
    return {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description: job.description,
        hiringOrganization: {
            "@type": "Organization",
            name: job.employerName || "IOPPS Employer",
        },
        jobLocation: {
            "@type": "Place",
            address: {
                "@type": "PostalAddress",
                addressLocality: job.location,
                addressCountry: "CA",
            },
        },
        employmentType: job.employmentType.toUpperCase(),
        ...(job.salaryRange && {
            baseSalary: {
                "@type": "MonetaryAmount",
                currency: "CAD",
                value: {
                    "@type": "QuantitativeValue",
                    value: job.salaryRange,
                },
            },
        }),
        ...(job.closingDate && {
            validThrough: new Date(job.closingDate).toISOString(),
        }),
    };
}
