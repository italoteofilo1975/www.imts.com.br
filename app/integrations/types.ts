export type IntegrationKey="imts_os"|"lead_webhook"|"crm"|"email"|"analytics"|"consent"|"storage"|"auth"|"observability";
export type IntegrationState="disabled"|"configured"|"healthy"|"degraded";
export type LeadIntent="solution"|"partnership"|"initiative"|"talent"|"capital"|"relations";
export type LeadPayload={intent:LeadIntent;name:string;email:string;organization?:string;role?:string;message:string;consent:boolean;source:"site";locale:"pt-BR";metadata?:Record<string,string>};
export type PendingLead={id:string;intent:LeadIntent;name:string;email:string;organization:string;role:string;message:string;destination:string;consent_version:string;created_at:string;correlation_id?:string};
export type AiQuery={question:string;sessionId?:string;level:"public"|"authenticated";context?:{path?:string;topic?:string}};
export type IntegrationStatus={key:IntegrationKey;state:IntegrationState;required:string[];configured:string[]};
