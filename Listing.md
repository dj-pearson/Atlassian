# Complete Guide: Listing Your Jira Forge App on Atlassian Marketplace

**The Atlassian Marketplace presents a massive opportunity for Jira app developers, with over $4 billion in lifetime sales and 5,700+ active apps serving 260,000+ customers.** However, significant changes are coming in 2025-2026 that will dramatically reshape the economics and requirements for marketplace success. Forge Custom UI apps now have substantial advantages over Connect apps, including **0% revenue sharing on the first $1 million in lifetime revenue** starting January 2026, automatic security compliance inheritance, and streamlined technical requirements.

The marketplace landscape is evolving rapidly with the **September 17, 2025 deadline for new Connect app submissions** and major revenue sharing restructuring that will increase Connect app commissions to 25% while keeping Forge apps at just 17%. For developers with Forge Custom UI apps, this creates a unique window of opportunity to capture market share with superior economics and reduced compliance overhead. Understanding the complete requirements—from technical specifications to marketing strategies—is essential for successful marketplace entry in this changing environment.

## Critical timeline changes reshape marketplace strategy

The most immediate concern for any Jira app developer is understanding the **fundamental platform transition happening across 2025-2026**. New Connect apps can no longer be submitted after September 17, 2025, with complete Connect support ending by 2026. This creates both urgency and opportunity for Forge developers, as the platform will receive all new capabilities and enjoys preferential treatment in marketplace economics.

**The revenue implications are substantial**. Starting January 1, 2026, Connect apps will face commission increases from 15% to 20%, then to 25% by July 2026. Meanwhile, Forge apps receive **0% commission on their first $1 million in lifetime revenue**, followed by just 16-17% rates. For a successful app generating $500,000 annually, this represents $125,000 in additional revenue compared to Connect apps—enough to fund significant additional development and marketing efforts.

Beyond economics, Forge Custom UI apps inherit approximately **30% of SOC 2 compliance requirements** automatically through Atlassian's managed infrastructure. This dramatically reduces the compliance burden for enterprise sales, where 72% of customers consider security certifications very or extremely important. The "Runs on Atlassian" badge available to Forge apps with no external data egress provides additional trust signals that Connect apps cannot achieve.

## Marketplace listing requirements demand precision and professionalism

Success on the Atlassian Marketplace begins with understanding the specific technical and content requirements that determine approval. **Every app must include three mandatory "highlights" screenshots** showing actual app interface within Atlassian products, not external mockups or promotional materials. These visual assets, along with up to 17 additional screenshots, form the primary conversion drivers for potential customers browsing the marketplace.

**App naming follows strict conventions** with a 60-character limit and specific formatting requirements. Names must use formats like "App Name for Jira" rather than "Jira App Name" to avoid trademark violations—one of the most common rejection reasons. The app description should focus on problem-solution fit with natural keyword integration, as the marketplace uses full-text search across titles, descriptions, and partner names for discoverability.

The new **streamlined category system includes just 10 categories** (reduced from 37), with each app allowed in up to two categories. Developers can also select up to four keywords from 60+ available options to showcase specific use cases. This categorization directly impacts search visibility, as search relevance ranks as the most critical factor in marketplace discovery, followed by "Paid via Atlassian" status and customer ratings.

Visual assets require **professional quality with specific technical specifications**: maximum 5MB file sizes for images, high-resolution clarity, and proprietary designs without Atlassian trademarks. User testing consistently shows preference for multiple smaller screenshots over fewer large images, with each screenshot telling a specific story about app functionality and workflow improvements.

## Revenue models and business structures determine long-term viability

The Atlassian Marketplace offers three primary payment models, each with distinct advantages and requirements. **"Paid via Atlassian" represents the preferred model** for new developers, as Atlassian handles all licensing, billing, and customer support while providing higher search rankings. This model also qualifies for the new Forge revenue sharing incentives and eliminates complex international payment processing.

**Pricing strategies should align with Atlassian's user-tier structure**: 10, 25, 50, 100, 250, 500, 1000, and 2000+ users. Successful apps typically implement freemium models with free tiers for 1-10 users, starter tiers at $1-5 per user monthly, professional tiers at $5-15, and enterprise tiers at $15+ with advanced features. This tiered approach maximizes market penetration while capturing value from larger deployments.

The **three-tier Marketplace Partner Program** creates clear advancement paths with specific requirements. Silver tier requires basic support (48-hour response) and security standards. Gold tier demands enhanced compliance (SOC 2 Type 2 OR ISO 27001:2022) and 24-hour support. Platinum tier requires both certifications, $1M+ annual sales, Bug Bounty Program participation, and third-party validated Trust Centers. Each tier provides progressively better visibility, marketing support, and partner manager engagement.

**Payment processing follows a $500 minimum threshold** with monthly payouts when accumulated revenue exceeds this amount. All payments occur in USD with automatic currency conversion, and partners receive payments within 30 days of month-end. International developers must handle their own income tax obligations, though Atlassian manages customer-facing taxes globally.

## Technical compliance and security create competitive advantages

**Forge Custom UI apps inherit significant security advantages** that reduce development overhead while enhancing enterprise appeal. The platform provides managed hosting, automatic security updates, built-in authentication, and data residency alignment with Atlassian's global infrastructure. This eliminates the need for developers to manage their own servers, implement JWT authentication, handle scaling, or maintain security patches.

**All marketplace cloud apps must meet universal security requirements**: HTTPS with TLS 1.2+ encryption, HSTS enabled with minimum one-year max-age, secure session cookies with HttpOnly and Secure flags, proper cache-control headers, input validation, output encoding, and AES-256 encryption for external data storage. Forge apps automatically satisfy most of these requirements through the platform.

**Performance standards become increasingly critical** with new rate limiting rules effective November 22, 2025. Forge apps will face cost-based rate limiting with 10 calls per second for app-level budgets and 10 calls per second per user for user-context operations. Apps must implement exponential backoff for HTTP 429 responses and monitor X-RateLimit-NearLimit headers to avoid service disruptions.

**Data handling and privacy compliance requirements** include mandatory GDPR compliance for apps processing EU user data, comprehensive privacy policies accessible via URLs in marketplace listings, data subject rights support (portability, deletion, correction), and appropriate cross-border transfer mechanisms. Forge apps benefit from automatic data residency alignment with Atlassian's regional infrastructure, simplifying compliance for global deployments.

## Review and approval processes require strategic preparation

**The marketplace review process takes 5-10 business days** for initial submissions, with teams working chronologically through submissions. Multiple approval rounds are common, and submission errors cause significant delays through back-and-forth communications. Apps undergo evaluation against functionality, security, performance, support, and branding requirements.

**Common rejection reasons follow predictable patterns**. Trademark violations represent the most frequent issue, typically involving incorrect naming conventions or unauthorized use of Atlassian branding. UI/UX problems occur when apps break host product interfaces or cause performance degradation. Documentation deficiencies include incomplete setup instructions or unclear user guidance. Security compliance failures involve missing security statements, insecure authentication, or inadequate privacy policies.

**Paid apps face additional security review requirements** including vulnerability scanning, code review, data protection assessment, authentication security evaluation, and third-party integration analysis. Apps participating in Bug Bounty programs or seeking Cloud Fortified certification undergo enhanced security review processes that can add 2-3 weeks to approval timelines.

**Updates typically deploy automatically** without re-approval for minor changes, bug fixes, UI enhancements, documentation updates, and new configuration options. However, re-approval is required for payment model changes, scope increases requiring additional permissions, hosting model modifications, major functionality additions, and base URL changes.

## Launch strategy and marketing optimization drive marketplace success

**Successful marketplace launches follow consistent patterns** observed across high-performing apps. Starting with a free tier for 1-10 users builds adoption and generates initial reviews, while community engagement in Atlassian's 4M+ user base creates organic growth opportunities. Superior documentation consistently ranks as a primary driver of app adoption, with comprehensive setup guides and troubleshooting resources reducing support burden.

**Search optimization requires understanding marketplace ranking factors** in priority order: search relevance (most critical), "Paid via Atlassian" status, ratings and reviews quality/quantity, installation count, Staff Picks editorial selection, and app age. This means new apps should focus intensively on keyword optimization, generating positive reviews quickly, and achieving rapid initial adoption to build momentum.

**Content marketing strategies should emphasize education and problem-solving** rather than promotional content. Successful publishers create regular blog content addressing customer pain points, comprehensive tutorial series, educational webinars, detailed case studies, and demo videos showing real-world implementations. Social media engagement using hashtags like #atlassian, #jira, and #confluence amplifies content reach within the community.

**Customer acquisition tactics within the Atlassian ecosystem** include active participation in developer and user communities, partnership development with complementary tools, integration with popular third-party services, referral program implementation, and strategic use of free trials to demonstrate value. The most successful apps build genuine relationships within the community rather than pursuing purely promotional strategies.

## Version management and ongoing operations ensure sustained success

**Post-launch optimization requires systematic performance monitoring** through Google Analytics integration, conversion metric tracking, support ticket analysis, user feedback collection, and competitive position monitoring. Successful apps implement rapid response protocols for critical issues while maintaining data-driven development roadmaps based on user behavior analysis and feature request patterns.

**Version management strategies should minimize re-approval requirements** by batching related changes, planning updates to avoid scope increases, implementing semantic versioning, maintaining backward compatibility, and preparing comprehensive rollback procedures. Progressive rollout strategies help identify issues before full deployment while reducing risk.

**Long-term success depends on continuous value delivery** through feature expansion based on user feedback, integration development with popular tools, market expansion to additional Atlassian products, enterprise feature development for larger customers, and API development enabling third-party integrations. Community building through user groups, beta programs, customer advisory boards, and training programs creates sustainable competitive advantages.

## Conclusion

The Atlassian Marketplace presents exceptional opportunities for Jira Forge Custom UI app developers, particularly with the substantial economic incentives and reduced compliance requirements available through 2026. Success requires understanding both the technical requirements and strategic landscape, with careful attention to the September 2025 Connect deadline and revenue sharing changes.

The most successful approach combines technical excellence with community engagement, starting with freemium models to build adoption while investing in superior documentation and customer support. The marketplace rewards apps that solve real customer problems with professional execution, comprehensive security postures, and active community participation. With proper preparation and strategic execution, Forge Custom UI apps can capture significant market share during this transitional period while building sustainable long-term businesses within the Atlassian ecosystem.
