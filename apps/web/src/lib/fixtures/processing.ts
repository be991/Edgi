export interface ProcessingReviewItemMock {
  id: string;
  sourceType: string;
  sourceUrl: string;
  reviewReason: 'conflicting_deadlines' | 'ambiguous_duplicate' | 'low_confidence' | 'fee_flagged' | 'eligibility_uncertain';
  confidenceScore: number;
  candidatePayload: {
    title: string;
    organization: string;
    deadline?: string | null;
    stipend?: string;
    applyUrl: string;
    summary: string;
    flagReason?: string;
  };
  conflictingOpportunity?: {
    id: string;
    title: string;
    organization: string;
    deadline?: string | null;
    applyUrl: string;
    summary: string;
  };
  evidenceTimeline: Array<{
    sourceName: string;
    sourceUrl: string;
    date: string;
    extractedValue: string;
    snippet: string;
    confidence: number;
  }>;
  status: 'pending' | 'resolved' | 'rejected';
  resolution?: string;
  createdAt: string;
}

export const mockProcessingReviewItems: ProcessingReviewItemMock[] = [
  {
    id: 'rev-001',
    sourceType: 'search_lead',
    sourceUrl: 'https://securityjobsdaily.com/posts/openssf-deadline-dec-1',
    reviewReason: 'conflicting_deadlines',
    confidenceScore: 0.75,
    candidatePayload: {
      title: 'OpenSSF Global Application Security Fellowship 2027',
      organization: 'Open Source Security Foundation',
      deadline: '2026-12-01T23:59:59.000Z',
      stipend: '$6,000 USD',
      applyUrl: 'https://openssf.org/apply/fellowship-2027',
      summary: 'Third-party aggregator blog claiming OpenSSF fellowship deadline extended to December 1st.',
    },
    conflictingOpportunity: {
      id: '11111111-1111-1111-1111-111111111111',
      title: 'OpenSSF Global Application Security Fellowship 2027',
      organization: 'Open Source Security Foundation',
      deadline: '2026-11-23T23:59:59.000Z',
      applyUrl: 'https://openssf.org/apply/fellowship-2027',
      summary: 'Official canonical listing with verified primary deadline of November 23, 2026.',
    },
    evidenceTimeline: [
      {
        sourceName: 'Security Jobs Daily (Aggregator)',
        sourceUrl: 'https://securityjobsdaily.com/posts/openssf-deadline-dec-1',
        date: '2026-11-09T14:30:00.000Z',
        extractedValue: 'Deadline: 2026-12-01',
        snippet: 'Update: Submit your applications before December 1st, 2026 to be considered for cohort 2027.',
        confidence: 0.65,
      },
      {
        sourceName: 'OpenSSF Official Blog (Primary Source)',
        sourceUrl: 'https://openssf.org/blog/2026/11/fellowship-applications-open',
        date: '2026-11-01T11:00:00.000Z',
        extractedValue: 'Deadline: 2026-11-23',
        snippet: 'Applications close strictly on November 23, 2026 at 23:59 UTC. Late submissions will not be considered.',
        confidence: 0.99,
      },
    ],
    status: 'pending',
    createdAt: '2026-11-09T15:00:00.000Z',
  },
  {
    id: 'rev-002',
    sourceType: 'rss_feed',
    sourceUrl: 'https://techcareers.ng/feed/africatech-cyber-fellow',
    reviewReason: 'ambiguous_duplicate',
    confidenceScore: 0.78,
    candidatePayload: {
      title: 'Graduate Cybersecurity Analyst Fellowship 2025',
      organization: 'Flutterwave Technologies',
      deadline: '2026-12-15T00:00:00.000Z',
      stipend: 'Competitive Monthly Stipend (NGN / USD)',
      applyUrl: 'https://flutterwave.com/careers/cyber-fellow',
      summary: 'Africa-wide 6-month graduate security training and mentorship track in payment application defense.',
    },
    conflictingOpportunity: {
      id: 'mock-opp-flutterwave-01',
      title: 'Flutterwave Graduate Cybersecurity Fellowship 2025',
      organization: 'Flutterwave',
      deadline: '2026-12-15T00:00:00.000Z',
      applyUrl: 'https://flutterwave.com/careers/cyber-fellow',
      summary: 'Join Flutterwave infosec defense team for an intensive 6-month hands-on fellowship in payment security.',
    },
    evidenceTimeline: [
      {
        sourceName: 'TechCareers NG Feed',
        sourceUrl: 'https://techcareers.ng/feed/africatech-cyber-fellow',
        date: '2026-11-10T08:00:00.000Z',
        extractedValue: 'Graduate Cybersecurity Analyst Fellowship',
        snippet: 'Flutterwave Technologies is accepting applications for the 2025/2026 cybersecurity analyst cohort.',
        confidence: 0.82,
      },
    ],
    status: 'pending',
    createdAt: '2026-11-10T08:15:00.000Z',
  },
  {
    id: 'rev-003',
    sourceType: 'manual_capture',
    sourceUrl: 'https://globaltech-grants.fake-host.org/apply',
    reviewReason: 'fee_flagged',
    confidenceScore: 0.94,
    candidatePayload: {
      title: 'International Student Technology Innovation Grant ($10,000)',
      organization: 'Global Innovation Foundation',
      deadline: '2026-12-30T23:59:59.000Z',
      stipend: '$10,000 USD grant',
      applyUrl: 'https://globaltech-grants.fake-host.org/apply',
      summary: 'High-value tech grant for African students. Flagged: Application requires an upfront $45 administrative processing fee.',
      flagReason: 'Requires $45 upfront application fee. Legitimate educational grants and fellowships do not charge submission fees.',
    },
    evidenceTimeline: [
      {
        sourceName: 'Pasted Application Form',
        sourceUrl: 'https://globaltech-grants.fake-host.org/apply',
        date: '2026-11-10T12:00:00.000Z',
        extractedValue: 'Application Fee: $45 USD',
        snippet: 'To complete your submission, pay the mandatory non-refundable application review fee of $45 via card.',
        confidence: 0.99,
      },
    ],
    status: 'pending',
    createdAt: '2026-11-10T12:05:00.000Z',
  },
  {
    id: 'rev-004',
    sourceType: 'website_crawl',
    sourceUrl: 'https://defcon.org/html/defcon-33/dc-33-cfp.html',
    reviewReason: 'eligibility_uncertain',
    confidenceScore: 0.62,
    candidatePayload: {
      title: 'DEF CON 33 Student Speaker & Travel Grant',
      organization: 'DEF CON Communications',
      deadline: '2026-05-01T23:59:59.000Z',
      stipend: 'Full badge + $1,500 travel allowance',
      applyUrl: 'https://defcon.org/html/defcon-33/dc-33-cfp.html',
      summary: 'Travel grant for student vulnerability researchers presenting novel research at DEF CON.',
    },
    evidenceTimeline: [
      {
        sourceName: 'DEF CON 33 CFP Page',
        sourceUrl: 'https://defcon.org/html/defcon-33/dc-33-cfp.html',
        date: '2026-11-08T10:00:00.000Z',
        extractedValue: 'Eligibility: Full-time students with accepted submission',
        snippet: 'Student grants available for primary authors of accepted presentations. Visa assistance letters provided upon request.',
        confidence: 0.70,
      },
    ],
    status: 'pending',
    createdAt: '2026-11-08T10:10:00.000Z',
  },
];
