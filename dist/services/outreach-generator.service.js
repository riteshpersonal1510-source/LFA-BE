"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.outreachGeneratorService = exports.OutreachGeneratorService = void 0;
class OutreachGeneratorService {
    generate(data) {
        const name = data.companyName || 'the business';
        const hasWebsite = !!(data.website && data.websiteReachable);
        const websiteWeak = hasWebsite && (data.websiteQuality?.score || 0) < 60;
        const subject = `Professional Website & Digital Growth for ${name}`;
        return {
            coldEmail: this.generateColdEmail(name, hasWebsite, websiteWeak, data.city || '', data.state || '', data.email, data.phone),
            whatsappMessage: this.generateWhatsApp(name, hasWebsite, websiteWeak),
            callScript: this.generateCallScript(name, hasWebsite, websiteWeak, data.city || '', data.phone),
            websiteProposal: this.generateProposal(name, hasWebsite, websiteWeak, data.websiteQuality?.issues),
            subject,
        };
    }
    generateColdEmail(name, hasWebsite, websiteWeak, city, state, email, phone) {
        const location = [city, state].filter(Boolean).join(', ');
        const intro = hasWebsite
            ? `I recently came across ${name}${location ? ` in ${location}` : ''} and was impressed by your presence.`
            : `I recently came across ${name}${location ? ` in ${location}` : ''} and noticed you don't have an online presence yet.`;
        const body = hasWebsite
            ? websiteWeak
                ? `I analyzed your current website and identified several opportunities to improve its performance, user experience, and search rankings. I'd love to share a few actionable recommendations.`
                : `I believe we can take your online presence to the next level with modern design trends and performance optimizations.`
            : `We specialize in building modern, mobile-friendly websites that help businesses like yours attract more customers and grow online.`;
        const emailText = email ? ` You can reply directly to this email, or ` : ' ';
        const phoneText = phone ? `reach me at ${phone}` : 'let me know a convenient time to connect';
        return `Hi there,

${intro}

${body}

I'd love the opportunity to discuss how we can help ${name} grow its digital presence.${emailText}${phoneText}.

Looking forward to hearing from you.

Best regards,
Digital Growth Team`;
    }
    generateWhatsApp(name, hasWebsite, websiteWeak) {
        const intro = `Hi! I came across ${name} and had a great idea to share.`;
        const body = hasWebsite
            ? websiteWeak
                ? `I noticed your website could perform better with some improvements. We can help with a modern redesign, better SEO, and faster performance.`
                : `I believe we can help take your online presence further with our digital growth services.`
            : `I noticed you don't have a website yet. We build modern, mobile-friendly websites that help businesses grow. Would you be interested in a quick chat?`;
        return `${intro}\n\n${body}\n\nLet me know if you'd like to learn more!`;
    }
    generateCallScript(name, hasWebsite, websiteWeak, city, phone) {
        const opening = `Hello, am I speaking with someone from ${name}?`;
        const intro = `My name is [Your Name] and I'm reaching out because I was looking at ${name}${city ? ` in ${city}` : ''}.`;
        const pitch = hasWebsite
            ? websiteWeak
                ? `I noticed your website could use some improvements to attract more customers and rank better on Google. We specialize in helping businesses like yours with website optimization and digital growth.`
                : `I believe we can help enhance your online presence with our digital services.`
            : `I noticed you don't have a website yet, which is a huge opportunity. We build professional websites that help businesses get more customers.`;
        const closing = phone
            ? `You can reach me at ${phone} or I can follow up with an email. Would you be open to a quick discussion?`
            : `Would you be open to a quick 10-minute discussion this week?`;
        return `${opening}\n\n${intro}\n\n${pitch}\n\n${closing}`;
    }
    generateProposal(name, hasWebsite, websiteWeak, issues) {
        const lines = [];
        lines.push(`Website Proposal for ${name}`);
        lines.push('='.repeat(40));
        lines.push('');
        if (!hasWebsite) {
            lines.push('Current Status: No website');
            lines.push('');
            lines.push('Recommended Services:');
            lines.push('  • Custom Website Development');
            lines.push('  • Mobile-Responsive Design');
            lines.push('  • SEO Optimization');
            lines.push('  • Contact Form Integration');
            lines.push('  • Google Business Profile Setup');
            lines.push('');
            lines.push('Estimated Investment:联系我们获取报价');
            lines.push('Timeline: 2-4 weeks');
        }
        else if (websiteWeak) {
            lines.push('Current Status: Website needs improvement');
            lines.push('');
            if (issues?.length) {
                lines.push('Issues Detected:');
                for (const issue of issues) {
                    lines.push(`  • ${issue}`);
                }
                lines.push('');
            }
            lines.push('Recommended Services:');
            lines.push('  • Website Redesign');
            lines.push('  • Performance Optimization');
            lines.push('  • SEO Enhancement');
            lines.push('  • Mobile Optimization');
            lines.push('  • Social Media Integration');
            lines.push('');
            lines.push('Estimated Investment:联系我们获取报价');
            lines.push('Timeline: 3-6 weeks');
        }
        else {
            lines.push('Current Status: Website exists');
            lines.push('');
            lines.push('Recommended Services:');
            lines.push('  • Website Maintenance & Updates');
            lines.push('  • Performance Monitoring');
            lines.push('  • SEO Monitoring');
            lines.push('  • Content Updates');
            lines.push('');
            lines.push('Estimated Investment:联系我们获取报价');
            lines.push('Timeline: Ongoing');
        }
        return lines.join('\n');
    }
}
exports.OutreachGeneratorService = OutreachGeneratorService;
exports.outreachGeneratorService = new OutreachGeneratorService();
//# sourceMappingURL=outreach-generator.service.js.map