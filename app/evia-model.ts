export type EviaExpression="idle"|"look-down"|"look-up-left"|"look-up-right"|"smile";
export type View="root"|"jobs"|"opportunities"|"capture"|"question"|"answer"|"evidence"|"evidence-detail"|"ksb"|"toc"|"otj"|"epa"|"settings"|"profile"|"accessibility";
export type AnswerMode="type"|"talk";
export type EvidenceTab="new"|"downloaded";
export type EpaArea="practical"|"interview"|"knowledge";
export type CourseTimeline={startDate:string;endDate:string;weeklyHours:number};
export type OtjEntry={id:string;date:string;title:string;hours:number};
export type AccessibilitySettings={textSize:"standard"|"large"|"extra";highContrast:boolean;reduceMotion:boolean};
export type EvidenceEntry={id:string;createdAt:number;categoryId:string;categoryTitle:string;jobId:string;jobTitle:string;opportunityId:string;title:string;bundle:string;instruction:string;question:string;codes:string[];answerMode:AnswerMode;answerText?:string;photoId?:string;photoName?:string;audioId?:string;audioName?:string;downloadedAt?:number};
export type DayRecap={finishedAt:number;evidenceCount:number;ksbTouched:number};
export type StoredMedia={id:string;blob:Blob;name:string;type:string;createdAt:number};
export type ProgressItem={label:"TOC"|"KSB"|"OTJ"|"EPA";name:string;value:number;onClick:()=>void};
export const STORAGE={name:"evia-full-name",onboarding:"evia-onboarding-complete",timeline:"evia-course-timeline",evidence:"evia-self-observation-evidence-v3",dayIds:"evia-current-day-entry-ids-v3",recap:"evia-last-day-recap-v3",otj:"evia-otj-entries",epa:"evia-self-observation-epa-v3",access:"evia-accessibility-v3"} as const;
export function firstName(name:string){return name.trim().split(/\s+/)[0]||"there"}
export function dotText(count:number){if(count<=0)return"";return`${":".repeat(Math.floor(count/2))}${count%2?".":""}`}
export function safeFileName(value:string){return value.trim().replace(/[^a-z0-9 _.-]+/gi,"").replace(/\s+/g,"-").replace(/-+/g,"-").slice(0,72)||"evidence"}
export function csvCell(value:string|number){const text=String(value??"");return`"${text.replace(/"/g,'""')}"`}
export function formatDate(value:number){return new Date(value).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"})}
