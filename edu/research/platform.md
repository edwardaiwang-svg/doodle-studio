# What K–5 classrooms in the US actually use: platform research for an elementary-teacher Chrome extension

Prepared 2026-09-26. Research used only native web search and page fetches.

**Evidence tags:**
- **[F]**: I fetched and read the page directly.
- **[S]**: I only saw the text in search-result snippets, because the site blocks automated fetching (help.seesaw.me, help.classdojo.com, rand.org, lausd.org, cbs17.com). These are lower confidence.
- **[V]**: vendor self-claim.

---

## 0. Bottom line

No single platform plays the role for elementary schools that Canvas and Schoology play for high schools. Elementary has two layers.

1. **Google Classroom is the most widely used general-purpose LMS in US K–12.** It leads by district count and by teacher use, and it is the most common place an elementary teacher can post material, especially in grades 3–5. It comes free with Google Workspace for Education and runs in the Chrome/ChromeOS environment most schools use.
2. **Seesaw is the only major platform built specifically for elementary (PreK–6).** It is the de-facto class platform in many PreK–2 classrooms. Its own claim is "over a third of elementary schools in the US," which matches Vermont state data. It is usually used *alongside* another LMS, not instead of one.

The other candidates play different roles:
- **ClassDojo** is close to universal (vendor claim: 95% of K–8 schools), but it is mainly a family-communication and behavior app.
- **Clever** is a login and rostering portal, not an LMS.
- **Canvas, Schoology and Brightspace** are the required K–12 LMS in some very large districts. This is why Canvas leads when the count is weighted by enrollment.
- **Microsoft Teams:** I found no evidence of meaningful elementary LMS use.

**Recommendation:** build for **Google Classroom first**. Build for **Seesaw second**, and only if PreK–2 reach matters. Canvas (including Canvas for Elementary) is the third option if large districts become the target.

**Confidence: moderate.** I found no nationally representative, product-level survey of LMS use split by elementary grade band (see §6). The conclusion combines:
- K–12 browser telemetry
- district-level market data
- one state's four annual surveys (Vermont)
- vendor claims
- district policy pages

---

## 1. Quantitative evidence

### 1a. Independent / third-party data points

**Top 40 lists by year.** The LearnPlatform/Instructure "EdTech Top 40" reports rank the most-accessed tools each school year. Below, "overall rank" means position in the ranked Top 40 list, and "LMS category" means the report's separate LMS-only ranking. Some years publish the overall 40 alphabetically, with no ranks.

| # | Finding | What it measures | Grade band | Data year | Source | Tag |
|---|---|---|---|---|---|---|
| 1 | LMS category top 5: 1 Google Classroom, 2 Canvas LMS, 3 Schoology, 4 Savvas Realize, 5 Seesaw. Seesaw is **not** in the overall Top 40 (alphabetical list); ClassDojo is not mentioned anywhere. | LearnPlatform browser-extension telemetry: "more than 64 billion interactions from 3.7 million students and 546,000 educators" | K–12, no grade split | 2024–25 school year (published Jun 30, 2025) | https://districtadministration.com/article/edtech-top-40-ranking-highlights-tools-you-could-be-using/ ; methodology: https://www.prnewswire.com/news-releases/new-learnplatform-by-instructure-report-shows-k-12-districts-are-more-selective-about-edtech-tools-as-they-face-budget-crisis-302492756.html ; https://marketbrief.edweek.org/education-market/despite-push-to-pare-back-ed-tech-report-finds-districts-inventories-are-still-growing/2025/07 | [F] |
| 2 | "Canvas, the second-most used LMS", which implies Google Classroom is #1. Statista shows the same LMS top 5 as row 1 for 2023–24, but it is paywalled. | Same telemetry, Sep 1 2023–May 31 2024, "over 57 billion engagements" | K–12 | 2023–24 | https://www.prnewswire.com/news-releases/new-learnplatform-by-instructure-report-finds-increases-in-more-unique-digital-tools-accessed-by-k-12-institutions-students-and-teachers-302180031.html ; Statista: https://www.statista.com/statistics/1447240/top-edtech-tools-used-in-k-12-schools-by-purpose-us/ | [F]; Statista [S] |
| 3 | Google Classroom named "No. 1 learning management system". The overall Top 40 was published alphabetically with no ranks. Canvas LMS, Clever and Schoology are in it; **Seesaw and ClassDojo are not.** | Same telemetry, Sep 1 2022–May 31 2023: "57bn+ interactions, 3m+ students, 465k+ educators" | K–12 | 2022–23 | https://districtadministration.com/briefing/edtech-top-40-familiar-learning-tools-most-popular-learnplatform-instructure/ ; https://www.edtechdigest.com/2023/07/18/2023-report-edtech-top-40/ | [F] |
| 4 | Ranked overall list: Google Classroom #8 (the top LMS), Canvas #14, Schoology #22. Clever is #7, classified as "IT Management, Single Sign-On (SSO)". **Seesaw and ClassDojo are not in the Top 40.** | "web traffic ... from the LearnPlatform for Educators and LearnPlatform for Students browser extensions". 2,030,336 students and 228,761 educators. Only districts with ≥1,000 extension student users were counted. | K–12 | Aug–Dec 2021 | Report PDF (third-party-hosted copy): https://s5fb208ad61e76cf7.jimcontent.com/download/version/1658747539/module/8155167464/name/EdTech-Top40.pdf | [F] |
| 5 | Google Classroom #6 overall (the top LMS), Canvas #20 | "Plug-in on Google's Chrome browser". About 254,000 educators and 2M+ students. | K–12 | 2020–21 | https://marketbrief.edweek.org/education-market/the-40-most-widely-used-ed-tech-products-from-last-school-year/2021/09 | [F] |

The 2025–26 edition switched to counting LTI launches inside Canvas, so it cannot be compared with the rows above: https://www.instructure.com/edtech-top40 [F].

**Market share, teacher surveys and state data.**

| # | Finding | What it measures | Grade band | Data year | Source | Tag |
|---|---|---|---|---|---|---|
| 6 | By implementation count: Google Classroom 28%, Canvas 28%, Schoology 22%. By student enrollment: Canvas 32%, Schoology 21%, Classroom 19%. | District/institution LMS deployments in ListEdTech's database: "9,658 LMS implementations across the United States and Canada". Seesaw is not tracked. | K–12, district level | Data as of Dec 4, 2024 | https://listedtech.com/blog/the-state-of-the-lms-market-in-2024-trends-in-k-12/ | [F] |
| 7 | Google Classroom 31% ("peak... stabilized through 2026"), Canvas 24%, Schoology 19%, Moodle 7%, Agilix Buzz 6%, TeacherEase 4%, Brightspace 2%, Other 6% | ListEdTech market share. The article does not say whether this is by implementations or by enrollment. | K–12 | Published May 20, 2026 | https://listedtech.com/blog/k-12-lms-market-update-insights-may-2026/ | [F] |
| 8 | "Total Google Classroom + Another LMS usage in 19.8% of districts". Canvas+Classroom is 4.1% and Schoology+Classroom is 4.5%. ListEdTech suggests "Elementary schools using Classroom while high schools adopt Canvas or Schoology" as a *possible* explanation; it did not measure this. | 7,865 districts, US and Canada | K–12 | Published May 28, 2025 | https://www.listedtech.com/blog/k12-dual-lms-adoption/ | [F] |
| 9 | "More than half (54%) of survey respondents said that Google Classroom was the learning management system their school used, while 28% noted the same for Canvas." In the same survey, 28% of teachers used ClassDojo (up from 22% in 2018), 30% Remind and 60% Zoom. | MDR (Dun & Bradstreet) survey of 996 K–12 public-school teachers | K–12 | Oct 2020 | https://essentials.edmarket.org/2021/07/how-2020-shifted-perceptions-of-technology-in-the-classroom/ ; https://www.edsurge.com/news/2021-01-26-pandemic-spurs-changes-in-the-edtech-schools-use-from-the-classroom-to-the-admin-office | [F] |
| 10 | "48 percent of survey respondents told the EdWeek Research Center they started using Google Classroom during the pandemic and planned to continue on, the highest such figure among all the products asked about by name." | EdWeek Research Center, nationally representative sample of educators | K–12 | Start of 2021–22 | https://www.edweek.org/technology/how-tech-driven-teaching-strategies-have-changed-during-the-pandemic/2022/04 | [F] |
| 11 | "Only 6 percent of educators said their district doesn't use" an LMS. No per-product split. | EdWeek Research Center, >1,000 district leaders, principals and teachers | K–12 | Late Jul–early Aug 2022 | https://www.edweek.org/technology/what-teachers-really-think-about-their-learning-management-systems/2022/09 ; https://www.edweek.org/technology/what-do-teachers-want-from-learning-management-systems-we-asked/2022/09 | [F] |
| 12 | **Vermont, school level:** Google Classroom named by 194 of 252 schools (77%). Seesaw named by 82 (33%) and called "the second most cited LMS". Canvas 25 and Schoology 25. 52% of schools named more than one LMS. | State survey of 276 schools, "95 percent of all public K-12 schools". The LMS question was open-ended. | All public schools (mostly elementary; no grade split) | FY20 survey, fielded Jul–Sep 30, 2020 | https://education.vermont.gov/sites/aoe/files/documents/edu-2020-annual-technology-survey-report.pdf | [F] |
| 13 | **Vermont, district level:** Seesaw used by 29 of 54 districts (54%). Google Classroom was deliberately left off the checklist because Google does not call it an LMS; 20 districts still wrote it in. Canvas 8, Schoology 7. | State district survey (100% participation) | All grades | FY21, fielded Aug–Sep 2021 | https://education.vermont.gov/sites/aoe/files/documents/edu-2021-annual-technology-survey-results.pdf | [F] |
| 14 | **Vermont, district level:** Google Workspace for Education 46 of 53 districts (87%). "Beyond GWFE, Seesaw remained the leading platform with 36 percent" (19 districts). Schoology 9, PowerSchool 8, Canvas 6. | State district survey | All grades | 2022–23 school year, fielded Jul–Oct 2023 (issued Mar 8, 2024) | https://education.vermont.gov/sites/aoe/files/documents/edu-2023-annual-technology-survey-report.pdf | [F] |
| 15 | **Vermont, district level:** "Google Workspace and Classroom" 46 of 54 districts (85%). Seesaw 13 (24%), Schoology 8, Canvas 7. The report adds: "Seesaw is an LMS solution specifically for elementary schools and in each case was listed in addition to another LMS." | State district survey, 54 districts and 277 schools | All grades | 2023–24 school year, fielded Jul–Oct 2024 (issued Jun 1, 2025) | https://education.vermont.gov/sites/aoe/files/documents/edu-annual-technology-survey-report-2024.pdf (landing page: https://education.vermont.gov/document/2024-annual-technology-survey-report) | [F] |
| 16 | "Most used apps by elementary teachers": 1 Seesaw, 2 Google Classroom, 3 Starfall, 4 Epic, 5 Lexia. No sample size or percentages given. | Non-probability poll of "hundreds of elementary teachers" by ESGI and ThinkFives. ESGI is an assessment tool for early learners, so respondents probably skew K–2. | Elementary | 2021 | https://thinkfives.com/classroom/top-5-most-used-apps-by-elementary-teachers/ ; ESGI positioning: https://riversideinsights.com/k12-assessments/esgi | [F] |
| 17 | ChromeOS is 82% (average) of student-device operating systems in Washington districts, up from 81% in 2024–25. This is context for the Chrome/Google fit. | Washington OSPI annual state technology survey | K–12 | 2025–26 | https://ospi.k12.wa.us/policy-funding/school-technology/annual-state-technology-survey | [F] |
| 18 | 79% of grade 6–8 teachers and 67% of grade 9–12 teachers use an LMS weekly. No elementary figure and no product split. | Project Tomorrow Speak Up, 50,000+ respondents | 6–12 | 2022–23 | https://www.govtech.com/education/k-12/is-most-classroom-tech-helping-students-or-teachers | [F] |

### 1b. Vendor self-claims

| # | Claim | Measures | Date | Source | Tag |
|---|---|---|---|---|---|
| V1 | Seesaw: "Used by 10M teachers, students and families in over a third of elementary schools in the US. Beyond the US, Seesaw is used in over 130 countries!" | Share of US elementary schools with any Seesaw users. The definition is not stated. | Undated claim on the live App Store listing (Sept 2026) | https://apps.apple.com/us/app/seesaw/id930565184 | [F][V] |
| V2 | Seesaw: "Trusted by more than 25 million students, teachers, and families worldwide"; "More than 10 million students used Seesaw this year alone for multimodal responses" | Global users | Press release, Aug 13, 2026 | https://www.einpresswire.com/article/934008679/seesaw-launches-ai-powered-assessment-experience-to-help-schools-turn-student-thinking-into-actionable-insight | [F][V] |
| V3 | Seesaw website, as quoted in news coverage of the Sept 2022 account-compromise incident: "over 10 million teachers, students, and family members every month across more than 75% of schools in the U.S." This **conflicts with V1** (see §6). | Share of US schools | ~Sept 2022 | https://www.cbs17.com/news/national-news/school-messaging-app-seesaw-responds-to-nsfw-photo-sent-to-parents/ ; the Sept 15, 2022 K-12 Dive report on the same incident says "10 million users": https://www.k12dive.com/news/parents-educators-received-explicit-image-in-seesaw-hacking/631951/ | CBS17 [S][V]; K-12 Dive [F] |
| V4 | Seesaw blog post titled "The #1 LMS for Elementary Students". It cites no data. | None | Jul 24, 2025 | https://seesaw.com/blog/the-1-lms-for-elementary-students-and-why-it-matters/ | [F][V] |
| V5 | ClassDojo: "Over 95% of U.S. K–8 schools already using ClassDojo"; "45 million families and teachers around the world" | Share of K–8 schools, probably any use at the school | Press release, Aug 14, 2025 | https://www.prnewswire.com/news-releases/classdojo-fast-tracks-districtwide-adoption-through-new-privacy-agreement-with-the-education-cooperative-302530413.html | [F][V] |
| V6 | Google: "Google Classroom helps more than 150 million students, educators and school leaders around the world" | Global users | Feb 17, 2021 (the newest official figure I found) | https://blog.google/outreach-initiatives/education/classroom-roadmap/ | [F][V] |
| V7 | Clever: "77% US K-12 schools use Clever"; "95 out of 100 of the largest US school districts trust Clever"; "27.5 million monthly active students" | School share, and monthly active students | Current site | https://www.clever.com/schools | [F][V] |

---

## 2. What each platform actually is

We need an LMS: a place where the teacher posts material and students open it. The candidates fall into four groups.

### Real LMSs (the teacher posts, students open)

**Google Classroom.** Common Sense Education (Aug 17, 2026) describes it as a digital organizer built on Google Workspace. https://www.commonsense.org/education/articles/teachers-essential-guide-to-google-classroom [F]

**Seesaw.** Self-described "Elementary Learning Experience Platform" for PreK/K–6 (https://seesaw.com/ [F]). Common Sense Education (Jun 30, 2025) calls it "a digital platform for teachers to assign classwork, engage with students, and provide feedback." It is "most often used in elementary schools," and "For younger students (pre-K to 2), the easiest option is the QR code that students can scan." https://www.commonsense.org/education/articles/teachers-essential-guide-to-seesaw [F]

**Canvas for Elementary.** Launched June 28, 2021. It is a Canvas interface mode, not a separate product: a "homeroom" dashboard, subjects instead of courses, and a daily schedule view.
- https://www.instructure.com/en-gb/node/16606 [F]
- https://community.instructure.com/en/kb/articles/663781-what-is-the-homeroom-in-canvas-for-elementary [S]

**Schoology and Brightspace.** Generic K–12 LMSs.
- Brightspace example: Gwinnett County (GA) "eCLASS" is "in use by every classroom, teacher, and student" across 134 schools and 176,000+ students. This is a D2L case study, so a vendor claim. https://www.d2l.com/why-d2l/customers/gwinnett-county-public-schools-digital-learning/ [F][V]

### Communication app: ClassDojo

ClassDojo's own boilerplate is about reaching families, reducing absences, improving behavior and "consistent communication" (V5 above). It is not positioned as the class LMS.

**Portfolios** does let a teacher deliver instruction to students:
- Assigned "Activities" with instructions.
- **Recorded video instructions**, which the help center says can be up to 8 minutes.
- Worksheet attachments, up to 10 pages.
- Students respond in their student account with text, video, photo or drawing.

Help-center sources, all [S] because the site blocks automated fetching:
- https://help.classdojo.com/hc/en-us/articles/360009899492-How-to-Assign-Student-Portfolio-Activities-to-Students
- https://help.classdojo.com/hc/en-us/articles/360048924271-How-to-Record-Video-Instructions-in-an-Assigned-Portfolio-Activity
- https://help.classdojo.com/hc/en-us/articles/360046851632-How-to-Assign-a-Worksheet-Using-ClassDojo-Portfolios
- https://help.classdojo.com/hc/en-us/articles/360047763572-Access-and-Respond-to-Assigned-Activities-in-the-Student-Account

So ClassDojo *can* carry a short instructional video. But I found no evidence that it is normally a class's LMS of record, and no official public developer API.

Its reach also looks different depending on what is counted. The vendor says 95% of K–8 schools, but the MDR 2020 survey found only 28% of K–12 teachers used it.

ClassDojo is absent from every EdTech Top 40 list I checked. Because it is mostly used through its mobile app, the Chrome-extension telemetry behind those lists would miss much of its use.

### Login portal: Clever

Clever provides single sign-on and rostering, not an LMS:
- "Log in to all digital resources in one central, customized portal with one password."
- "Automatically create, update, and roster classes based on the daily changes in your SIS."
- Source: https://www.clever.com/schools [F]

LearnPlatform classifies Clever as "IT Management, Single Sign-On (SSO)" (row 4 PDF [F]). K–5 students use Clever to click into Seesaw, Classroom and other apps. Seesaw offers Clever Instant Login and Secure Sync rostering (https://www.clever.com/app-gallery/seesaw/ [F]).

Clever is not a place to post videos into.

### Microsoft Teams for Education

I found no data showing meaningful elementary LMS use:
- It does not appear in ListEdTech's 2026 K–12 share list.
- EdWeek, writing about pandemic videoconferencing, says "a much smaller percentage of school districts also use Microsoft Teams": https://www.edweek.org/technology/pandemic-tech-tools-that-are-here-to-stay/2022/03 [F]

---

## 3. Grade-band split (PreK–2 vs 3–5)

### Pattern: Seesaw for the youngest grades, another LMS from grade 3

This comes from district policy pages, not from national statistics.

- **Arlington ISD (TX):** "Seesaw is AISD's learning management system (LMS) for grades PreK-2." and "Canvas is AISD's learning management system (LMS) for grades 3-12." https://www.aisd.net/district/resources/classlink/ [F]
- **Richardson ISD (TX), Aug 15, 2024:** "For the youngest learners in RISD, the school district uses Seesaw as the digital learning management system." and "RISD students in third grade through senior year will use Schoology." https://web.risd.org/home/risd-uses-schoology-seesaw-learning-management-systems/ [F]
- **Oakland USD (CA):** the district pays for "Seesaw for Schools" for "TK-2 and some Special Education classrooms." Grades 3–12 teachers may use free or paid Seesaw on their own. https://teachercentral.ousd.org/tech/online-programs/seesaw [F]
- **Lower Merion SD (PA):**
  - K–4 uses Seesaw as the primary LMS, with Google Classroom as "an extension of their learning management system."
  - Grades 5–12 use Schoology.
  - https://www.lmsd.org/academics/instructional-tech/virtual [F]
- **"KSD"** (the page does not give the full district name): Seesaw is the "newly adopted LMS... for all PreK through 2nd grade teachers, students, and families." https://sites.google.com/ksd.org/SeeSaw [F]
- **Vermont 2024:** Seesaw is "specifically for elementary schools and in each case was listed in addition to another LMS." (row 15) [F]
- **Common Sense:** QR-code sign-in is recommended for PreK–2 (§2) [F]

### Counter-pattern: one required K–12 LMS, including elementary

This is common in very large districts.

- **LAUSD:** Schoology is the official LMS for TK–12. https://lms.lausd.net/ [S] (lausd.org pages returned HTTP 403)
- **Houston ISD:** Canvas. Elementary school sites link students to the Canvas login. https://crespo.houstonisd.org/our-families-students/login-to-canvas [F]
- **Clark County SD (NV):** Canvas across grades. https://www.ccsd.net/employees/canvas/canvas-employees.php [S]
- **Gwinnett (GA):** Brightspace ("eCLASS"). [F][V]
- **Chicago Public Schools:** "No enterprise LMS currently in place." Google Classroom is "Acceptable, but Vendor Supported." Seesaw is listed as acceptable only for "Online Communication with Teachers and Students." The page is undated. https://www.cps.edu/about/policies/acceptable-use-policy/platform-guidelines/ [F]

### Summary

- No national figure splitting K–2 from 3–5 was found.
- Qualitatively:
  - Seesaw is strongest in PreK–2, where students can't yet type logins and use QR codes.
  - Google Classroom, or the district's K–12 LMS, takes over from about grade 3.
  - Many K–2 teachers in Google districts use both.

### Trend

Vermont is the only state where I found repeated data, and Seesaw's district share there fell:

| Year | Districts using Seesaw |
|---|---|
| 2021 | 54% (29/54) |
| 2023 | 36% (19/53) |
| 2024 | 24% (13/54) |

Over the same period Google stayed at about 85–87%. The survey wording changed somewhat between years, but the direction is clear.

Seesaw's free tier ("Seesaw Starter") also narrowed on **June 30, 2026**. New limits are "1 active class" per teacher, "Up to 35 students per class", "1 teacher per class", "35 activities in My Library" and "5 multimedia items per post." Existing content is not affected. https://seesaw.com/pricing-packages/free-changes/ [F]

This will probably shrink free use started by individual teachers. School-paid licenses are unaffected.

---

## 4. Can a third party post to the class? How do teacher and student accounts differ?

### 4a. Google Classroom: yes, officially supported

There are three ways in, from simplest to most fragile.

**Option 1: share URL or share button (no OAuth).**

Google's share button "provides a low effort pathway to make your content accessible from within Google Classroom." It lets users "create Classroom assignments, questions, announcements, and materials in a pop up iframe."
- `itemtype` can be `announcement`, `assignment`, `material` or `question`.
- A custom button can link directly to `https://classroom.google.com/share?url={url-to-share}`.
- "When a user clicks the share button, they are prompted to sign in with their Google Workspace for Education account."
- If a student picks a class, the item type is ignored. In other words, students can't post materials this way.
- https://developers.google.com/workspace/classroom/guides/sharebutton [F]

This is the fastest MVP path: the extension opens the share URL with the video's URL, for example a YouTube link, and the teacher picks the class.

Google's own "Share to Classroom" Chrome extension was retired on Aug 15, 2020 [S]. The share button itself still exists. https://support.google.com/edu/classroom/thread/56731186/what-can-replace-the-share-to-classroom-chrome-extension-that-s-being-discontinued-in-august?hl=en

**Option 2: Classroom REST API (true one-click posting).**

- **Endpoint:** `POST https://classroom.googleapis.com/v1/courses/{courseId}/courseWorkMaterials`
- **Scope:** `https://www.googleapis.com/auth/classroom.courseworkmaterials`
- **Contents:** one post can hold up to 20 material items. Each item is a `driveFile`, `youtubeVideo`, `link` or `form`.
- **Defaults:** `state` defaults to `DRAFT`, so set `PUBLISHED`. `assigneeMode` defaults to `ALL_STUDENTS`. `topicId` and `scheduledTime` are optional.
- **Errors:** returns `PERMISSION_DENIED` "if the requesting user is not permitted to access the requested course, create course work material in the requested course, share a Drive attachment".
- Docs:
  - https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWorkMaterials/create [F]
  - https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWorkMaterials [F]

For your own MP4s (instead of YouTube):
- Upload the file to the teacher's Drive using the `drive.file` scope, which Google classifies as **Non-sensitive**, then attach it as a `driveFile`.
- `drive` and `drive.readonly` are **Restricted**, so avoid them.
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth [F]

Items are tied to the developer project that created them:
- "CourseWork can only be created on behalf of the course's teacher."
- "Student submissions may only be modified by the Developer Console project that created the corresponding CourseWork resource."
  - Source: https://developers.google.com/workspace/classroom/guides/manage-coursework [F]
- `courseWorkMaterials.patch` also returns `PERMISSION_DENIED` for developer-project access errors.
  - Source: https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWorkMaterials/patch [F]

Plan on editing or deleting only materials that our own project created.

Gates to plan for:
- **Google OAuth app verification.** "If your public application uses scopes that permit access to certain user data, it must complete a verification process." https://developers.google.com/workspace/classroom/guides/auth [F]
  - A July 2026 Google developer-forum post lists Classroom scopes as "all sensitive; no restricted scopes" and reports a verification wait of about 6 weeks. https://discuss.google.dev/t/oauth-verification-stuck-6-weeks-sensitive-google-classroom-scopes-no-trust-safety-email-project-eduvetra/378317 [F]
  - A third-party blog says Classroom scopes are "restricted" (https://www.rapidevelopers.com/bubble-integrations/google-classroom [S]). These conflict. Confirm the classification in Google Cloud Console.
- **District admin app-access controls.** Admins decide whether third-party apps can reach their Google data. Users marked under 18 can't use unconfigured apps unless they request access and an admin approves it. Blocked calls return `access_not_configured` or `admin_policy_enforced`. https://developers.google.com/workspace/classroom/best-practices/access-control-enhancements [F]
- **Licensing.** "You don't need to use any paid Google Cloud features to use Classroom API." Classroom **add-ons**, however, need "an appropriate Google Workspace for Education license." So avoid the add-on route for a product that must work on free schools.
  - https://developers.google.com/workspace/classroom/guides/onboarding/prerequisites [F]
  - https://developers.google.com/workspace/classroom/add-ons/requirements [F]

**Option 3: scripting the classroom.google.com page directly.** Not needed, given options 1 and 2.

**Telling teachers from students.** In Google Classroom, a person's role is set per course, not per account.
- `courses.list` with `teacherId="me"` returns the courses where the signed-in user is a teacher; `studentId="me"` returns their student courses. If `teacherId="me"` with `courseStates=ACTIVE` returns anything, the user can post.
  - https://developers.google.com/workspace/classroom/reference/rest/v1/courses/list [F]
- `userProfiles.get("me")` returns two useful fields:
  - `verifiedTeacher`: "Represents whether a Google Workspace for Education user's domain administrator has explicitly verified them as being a teacher. This field is always false if the user is not a member of a Google Workspace for Education domain."
  - `permissions`, which can include `CREATE_COURSE` ("User is permitted to create a course").
  - https://developers.google.com/workspace/classroom/reference/rest/v1/userProfiles [F]
- Admins choose who can create classes: anyone in the domain, all self-declared and verified teachers, or verified teachers only. https://support.google.com/edu/classroom/answer/6071551 [S]
- The server enforces this too: the API returns `PERMISSION_DENIED` to non-teachers.

### 4b. Seesaw: no public or partner posting API found

**What exists.** Seesaw's integration and partnership pages list:
- LMS partners: Canvas, Schoology, Google Classroom, D2L
- Sign-in partners: Okta, Microsoft, ClassLink
- Rostering partners: Clever, Wonde
- Content partners

There is no API, developer portal or "Share to Seesaw" button.
- https://seesaw.com/about-us/partnerships/ [F]
- https://seesaw.com/features/technology-integration/ [F]

**Existing integrations don't help us.** They either push Seesaw content *into* another LMS or are admin-only:
- **Canvas, Schoology and D2L:** an LTI integration, only for district customers on Seesaw's paid "Seesaw Instruction & Insights" plan. The Canvas admin creates an LTI key with redirect URI `https://app.seesaw.me/api/lti/launch`. "Teachers can add Seesaw activities to Canvas assignments."
  - https://help.seesaw.me/hc/en-us/articles/6593214528525-Seesaw-Canvas-LTI-Integration-Setup-for-Admins [S]
  - https://help.seesaw.me/hc/en-us/articles/24537216561293-Seesaw-Schoology-integration-setup-for-Admins [S]
  - https://help.seesaw.me/hc/en-us/articles/35453265949197-Seesaw-D2L-LTI-Integration-Setup-for-Admins [S]
- **Google Classroom:** import the class roster from Classroom, or copy a "Student Activity Link" and paste it into Classroom.
  - https://help.seesaw.me/hc/en-us/articles/360028685131-How-to-use-Seesaw-with-Google-Classroom [S]

**How a teacher posts a video by hand.** Create Activity → "YouTube Video" option (search YouTube or paste a URL; optional trim). The video plays inside Seesaw through YouTube Player for Education, with students signed out of YouTube.
- https://help.seesaw.me/hc/en-us/articles/44005134710157-Embedding-YouTube-videos-in-Activities-with-YouTube-Player-for-Education [S]
- https://help.seesaw.me/hc/en-us/articles/17964278341005-How-to-create-edit-and-assign-Activities-in-Seesaw [S]

**What that leaves for us.** The only programmatic route is an extension content script that drives the teacher's own signed-in session at app.seesaw.me. Its page structure is undocumented, so it could break on any Seesaw release. The fallback is a "copy link / guided paste" helper.

**Terms of service.** Seesaw End User Terms, updated July 8, 2024, §2.2 bars:
- (b) "any robot, spider, scraper ... or any other automated means to access the Service in a manner that sends more request messages to the servers running the Service than a human can reasonably produce in the same period of time by using a conventional on-line web browser"
- (a) reverse engineering
- https://seesaw.com/terms-of-service/end-user-terms/ [F]

A helper that runs only when the teacher clicks, at human speed, is arguably within the wording, but it remains a gray area. Pursue a Seesaw partnership before scaling.

**Telling teachers from students.** None of the following is exposed through an API.
- The sign-in page at app.seesaw.me asks the user to choose "I'm a Teacher", "I'm a Student", "I'm a Family Member" or "I'm a Seesaw Administrator". https://app.seesaw.me/ [S]
- **Teachers** sign in with Email/Password, Google, Microsoft, Okta, Clever or ClassLink.
- **Students** sign in with Email/Password, Text Code, QR code, Google, Microsoft, Okta, Clever or ClassLink. The teacher chooses whether the class uses code sign-in or email/SSO.
- **Home Learning Codes:** each student gets a QR code plus a 16-letter code, valid for one year.
- Sources:
  - https://help.seesaw.me/hc/en-us/articles/203495019-Student-sign-in-modes [S]
  - https://help.seesaw.me/hc/en-us/articles/4424230271501-Seesaw-Codes [S]
  - https://help.seesaw.me/hc/en-us/articles/360045960531-Home-Learning-Codes [S]
  - https://help.seesaw.me/hc/en-us/articles/23353336083725-Signing-in-to-Seesaw-with-email-or-SSO [S]
- The old separate "Seesaw Class" and "Seesaw Family" apps have merged into one Seesaw app with account switching.
  - https://help.seesaw.me/hc/en-us/articles/7630381703565-Seesaw-app-FAQs-for-families-and-students [S]
  - https://help.seesaw.me/hc/en-us/articles/7457514926861-Account-Switching-FAQ [S]
- Administrator accounts are separate. School admins sync automatically from Clever/ClassLink; district admins do not.
  - https://help.seesaw.me/hc/en-us/articles/23272332273421-Introduction-to-Seesaw-Administrator-accounts [S]

An extension would have to infer the role from the signed-in web page, which is undocumented.

### 4c. A gate that applies to both: managed Chrome in schools

School admins can set Chrome to "Block all apps, admin manages allowlist" and can run an extension-request workflow. Expect to need IT approval in many districts.
- https://support.google.com/chrome/a/answer/6177431 [S]
- https://support.google.com/chrome/a/answer/10405494 [S]

---

## 5. Recommendation

### Target Google Classroom first

1. **Largest reach, and consistent across every source.**
   - #1 LMS in every LearnPlatform year checked (2020–21 through 2024–25).
   - #1 by district implementations (ListEdTech: 28% in 2024, 31% in 2026).
   - The school's LMS for 54% of K–12 teachers (MDR 2020).
   - Used by 77% of Vermont schools (2020) and 85–87% of Vermont districts (2023–24). Most Vermont schools are elementary schools.
   - It is where grade 3–5 teachers in Google districts post, and many K–2 teachers use it alongside Seesaw (for example, Lower Merion).
2. **Documented, supported posting paths.**
   - A no-OAuth share URL is enough for an MVP.
   - `courseWorkMaterials` with `youtubeVideo`, `driveFile` or `link` gives one-click posting.
   - The API reliably tells teachers from students (`courses.list?teacherId=me`, `verifiedTeacher`, `CREATE_COURSE`).
3. **Fits the environment.** School fleets run mostly ChromeOS (Washington: 82%) with Google Workspace accounts, which is exactly where a Chrome extension lives.

**Main risks:**
- Waiting for OAuth verification.
- District admin app-access settings.
- Managed-extension allowlists.

**Mitigation:** ship the share-URL flow first. It needs no OAuth and works even where the API app has not been approved.

### Second: Seesaw, if K–2 is core to the product

**Why:**
- It is the one platform built for elementary.
- Reach is "over a third of US elementary schools" by its own claim, and 24–36% of Vermont districts in 2023–24.
- It dominates PreK–2 wherever a district adopts it.

**Costs:**
- No API, so posting means brittle page automation with a terms-of-service gray area.
- Adoption appears to have contracted since 2021 (Vermont).
- The free tier was cut back on June 30, 2026.

**Approach:**
- Start with a guided "copy link / create YouTube activity" flow on app.seesaw.me.
- Keep automation user-triggered and human-paced.
- Open partnership talks with Seesaw.

### Third, if selling district-wide to large systems: Canvas, including Canvas for Elementary

- It leads by enrollment (ListEdTech 2024: 32%).
- It is the required K–12 LMS in districts such as Houston ISD and Clark County.
- It has a documented public REST API, for example announcements through the Discussion Topics API: https://canvas.instructure.com/doc/api/announcements.html [F]. I did not evaluate this API in depth.
- Schoology (LAUSD; Richardson ISD grades 3–12) would come after Canvas.

### Not targets

- **ClassDojo:** communication-first and no public API found. It can carry video instructions in Portfolios, but it is not the class's LMS of record.
- **Clever:** a login portal.
- **Microsoft Teams:** no evidence of elementary use.

---

## 6. Conflicts, caveats, and what I could not find

### Conflicts between sources

- **Seesaw's reach claims disagree.** The current App Store listing says "over a third of elementary schools in the US." The 2022 website, as reported by news coverage, said "more than 75% of schools in the U.S."
  - The two probably count different things (any use vs. monthly active) at different times (pandemic peak vs. now).
  - Vermont's 2020 school-level figure of 33% matches the lower claim.
  - Treat about one-third of US elementary schools as the planning *ceiling*.
- **ClassDojo's reach depends on what is counted.** 95% of K–8 schools (vendor, probably any use at the school) vs. 28% of K–12 teachers (MDR 2020). A school where it is present is not the same as a teacher using it, and neither figure measures posting instruction.
- **LearnPlatform's Top 40 undercounts app-based tools.**
  - The data comes from a Chrome browser extension ("plug-in on Google's Chrome browser" in 2020–21; browser-extension "web traffic" in 2021–22).
  - It covers only districts that opted in, so it is not a probability sample.
  - It cannot see native iPad or phone app use, so Seesaw and ClassDojo are likely undercounted. That helps explain why neither appears in the overall Top 40 (2021–22, 2022–23, 2024–25), while Seesaw still ranks #5 in the LMS category (2024–25).
- **ListEdTech shows two different leaders.** Google Classroom is #1 by implementations but #3 by enrollment, where Canvas is #1. Large districts standardize on Canvas or Schoology. The 2026 figures don't state their basis.
- **The ESGI/ThinkFives poll puts Seesaw #1 among elementary teachers**, while Seesaw is only #5 among K–12 LMSs. ESGI is a PreK–2 assessment tool, so its respondents likely skew toward the grades where Seesaw is strongest. This fits the grade-band split rather than contradicting it.
- **Google Classroom user count.** The only official figure I found is 150M+ globally (Feb 2021). A "180M" figure appears on secondary sites but was not verified in any Google source.
- **A misattributed statistic.** Search summaries repeat "54% of teachers used Google Classroom as their primary LMS (EdWeek, 2021)." It actually comes from the MDR survey of Oct 2020, and it measured "the LMS their school used," not the teacher's primary LMS.

### Not found

- **A nationally representative, product-level LMS survey for elementary, or split by K–2 vs 3–5.** Checked: EdWeek Research Center (its published LMS results have no product breakdown), RAND American Teacher Panel / American Instructional Resources Survey / Learn Together, Common Sense, Project Tomorrow Speak Up, and NCES School Pulse Panel.
  - rand.org returns HTTP 403 to automated fetches, so I could not check RAND's tables directly, and searches surfaced no product-level LMS figures from RAND.
  - Common Sense's 2019 census (data from May 2018, 1,208 teachers) reports only tool *categories*: https://www.commonsense.org/sites/default/files/pdf/2019-04/common-sense-educator-census-2019-executive-summary.pdf [F]
- **Any Google-published US or elementary market share for Classroom.**
- **A Seesaw public or partner posting API, or a "Share to Seesaw" button.**
- **A ClassDojo public API.**
- **A Microsoft Teams for Education elementary usage figure.**
- **RAND's 2025 pre-K teacher survey** says 56% of pre-K teachers use LMSs but names no products (https://www.rand.org/pubs/research_reports/RRA4412-2.html [S]).

---

## 7. Source index

**Usage data (independent):**
- https://districtadministration.com/article/edtech-top-40-ranking-highlights-tools-you-could-be-using/
- https://districtadministration.com/briefing/edtech-top-40-familiar-learning-tools-most-popular-learnplatform-instructure/
- https://www.prnewswire.com/news-releases/new-learnplatform-by-instructure-report-shows-k-12-districts-are-more-selective-about-edtech-tools-as-they-face-budget-crisis-302492756.html
- https://www.prnewswire.com/news-releases/new-learnplatform-by-instructure-report-finds-increases-in-more-unique-digital-tools-accessed-by-k-12-institutions-students-and-teachers-302180031.html
- https://marketbrief.edweek.org/education-market/despite-push-to-pare-back-ed-tech-report-finds-districts-inventories-are-still-growing/2025/07
- https://marketbrief.edweek.org/education-market/the-40-most-widely-used-ed-tech-products-from-last-school-year/2021/09
- https://www.edtechdigest.com/2023/07/18/2023-report-edtech-top-40/
- https://s5fb208ad61e76cf7.jimcontent.com/download/version/1658747539/module/8155167464/name/EdTech-Top40.pdf
- https://www.instructure.com/edtech-top40
- https://www.statista.com/statistics/1447240/top-edtech-tools-used-in-k-12-schools-by-purpose-us/
- https://listedtech.com/blog/the-state-of-the-lms-market-in-2024-trends-in-k-12/
- https://listedtech.com/blog/k-12-lms-market-update-insights-may-2026/
- https://www.listedtech.com/blog/k12-dual-lms-adoption/
- https://essentials.edmarket.org/2021/07/how-2020-shifted-perceptions-of-technology-in-the-classroom/
- https://www.edsurge.com/news/2021-01-26-pandemic-spurs-changes-in-the-edtech-schools-use-from-the-classroom-to-the-admin-office
- https://www.edweek.org/technology/how-tech-driven-teaching-strategies-have-changed-during-the-pandemic/2022/04
- https://www.edweek.org/technology/what-teachers-really-think-about-their-learning-management-systems/2022/09
- https://www.edweek.org/technology/what-do-teachers-want-from-learning-management-systems-we-asked/2022/09
- https://www.edweek.org/technology/pandemic-tech-tools-that-are-here-to-stay/2022/03
- https://education.vermont.gov/sites/aoe/files/documents/edu-2020-annual-technology-survey-report.pdf
- https://education.vermont.gov/sites/aoe/files/documents/edu-2021-annual-technology-survey-results.pdf
- https://education.vermont.gov/sites/aoe/files/documents/edu-2023-annual-technology-survey-report.pdf
- https://education.vermont.gov/sites/aoe/files/documents/edu-annual-technology-survey-report-2024.pdf
- https://education.vermont.gov/document/2024-annual-technology-survey-report
- https://thinkfives.com/classroom/top-5-most-used-apps-by-elementary-teachers/
- https://riversideinsights.com/k12-assessments/esgi
- https://ospi.k12.wa.us/policy-funding/school-technology/annual-state-technology-survey
- https://www.govtech.com/education/k-12/is-most-classroom-tech-helping-students-or-teachers
- https://www.commonsense.org/sites/default/files/pdf/2019-04/common-sense-educator-census-2019-executive-summary.pdf
- https://www.rand.org/pubs/research_reports/RRA4412-2.html

**Vendor claims:**
- https://apps.apple.com/us/app/seesaw/id930565184
- https://www.einpresswire.com/article/934008679/seesaw-launches-ai-powered-assessment-experience-to-help-schools-turn-student-thinking-into-actionable-insight
- https://www.cbs17.com/news/national-news/school-messaging-app-seesaw-responds-to-nsfw-photo-sent-to-parents/
- https://www.k12dive.com/news/parents-educators-received-explicit-image-in-seesaw-hacking/631951/
- https://seesaw.com/blog/the-1-lms-for-elementary-students-and-why-it-matters/
- https://seesaw.com/
- https://seesaw.com/pricing-packages/free-changes/
- https://www.prnewswire.com/news-releases/classdojo-fast-tracks-districtwide-adoption-through-new-privacy-agreement-with-the-education-cooperative-302530413.html
- https://blog.google/outreach-initiatives/education/classroom-roadmap/
- https://www.clever.com/schools
- https://www.clever.com/app-gallery/seesaw/
- https://www.d2l.com/why-d2l/customers/gwinnett-county-public-schools-digital-learning/

**Role characterizations and district policies:**
- https://www.commonsense.org/education/articles/teachers-essential-guide-to-seesaw
- https://www.commonsense.org/education/articles/teachers-essential-guide-to-google-classroom
- https://www.instructure.com/en-gb/node/16606
- https://community.instructure.com/en/kb/articles/663781-what-is-the-homeroom-in-canvas-for-elementary
- https://www.aisd.net/district/resources/classlink/
- https://web.risd.org/home/risd-uses-schoology-seesaw-learning-management-systems/
- https://teachercentral.ousd.org/tech/online-programs/seesaw
- https://www.lmsd.org/academics/instructional-tech/virtual
- https://sites.google.com/ksd.org/SeeSaw
- https://lms.lausd.net/
- https://crespo.houstonisd.org/our-families-students/login-to-canvas
- https://www.ccsd.net/employees/canvas/canvas-employees.php
- https://www.cps.edu/about/policies/acceptable-use-policy/platform-guidelines/

**ClassDojo Portfolios:**
- https://help.classdojo.com/hc/en-us/articles/360009899492-How-to-Assign-Student-Portfolio-Activities-to-Students
- https://help.classdojo.com/hc/en-us/articles/360048924271-How-to-Record-Video-Instructions-in-an-Assigned-Portfolio-Activity
- https://help.classdojo.com/hc/en-us/articles/360046851632-How-to-Assign-a-Worksheet-Using-ClassDojo-Portfolios
- https://help.classdojo.com/hc/en-us/articles/360047763572-Access-and-Respond-to-Assigned-Activities-in-the-Student-Account

**Google Classroom integration:**
- https://developers.google.com/workspace/classroom/guides/sharebutton
- https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWorkMaterials/create
- https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWorkMaterials
- https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWorkMaterials/patch
- https://developers.google.com/workspace/classroom/guides/manage-coursework
- https://developers.google.com/workspace/classroom/reference/rest/v1/courses/list
- https://developers.google.com/workspace/classroom/reference/rest/v1/userProfiles
- https://developers.google.com/workspace/classroom/guides/auth
- https://developers.google.com/workspace/classroom/best-practices/access-control-enhancements
- https://developers.google.com/workspace/classroom/guides/onboarding/prerequisites
- https://developers.google.com/workspace/classroom/add-ons/requirements
- https://developers.google.com/workspace/drive/api/guides/api-specific-auth
- https://discuss.google.dev/t/oauth-verification-stuck-6-weeks-sensitive-google-classroom-scopes-no-trust-safety-email-project-eduvetra/378317
- https://www.rapidevelopers.com/bubble-integrations/google-classroom
- https://support.google.com/edu/classroom/answer/6071551
- https://support.google.com/edu/classroom/thread/56731186/what-can-replace-the-share-to-classroom-chrome-extension-that-s-being-discontinued-in-august?hl=en

**Seesaw integration:**
- https://seesaw.com/about-us/partnerships/
- https://seesaw.com/features/technology-integration/
- https://seesaw.com/terms-of-service/end-user-terms/
- https://help.seesaw.me/hc/en-us/articles/6593214528525-Seesaw-Canvas-LTI-Integration-Setup-for-Admins
- https://help.seesaw.me/hc/en-us/articles/24537216561293-Seesaw-Schoology-integration-setup-for-Admins
- https://help.seesaw.me/hc/en-us/articles/35453265949197-Seesaw-D2L-LTI-Integration-Setup-for-Admins
- https://help.seesaw.me/hc/en-us/articles/360028685131-How-to-use-Seesaw-with-Google-Classroom
- https://help.seesaw.me/hc/en-us/articles/44005134710157-Embedding-YouTube-videos-in-Activities-with-YouTube-Player-for-Education
- https://help.seesaw.me/hc/en-us/articles/17964278341005-How-to-create-edit-and-assign-Activities-in-Seesaw
- https://app.seesaw.me/
- https://help.seesaw.me/hc/en-us/articles/203495019-Student-sign-in-modes
- https://help.seesaw.me/hc/en-us/articles/4424230271501-Seesaw-Codes
- https://help.seesaw.me/hc/en-us/articles/360045960531-Home-Learning-Codes
- https://help.seesaw.me/hc/en-us/articles/23353336083725-Signing-in-to-Seesaw-with-email-or-SSO
- https://help.seesaw.me/hc/en-us/articles/7630381703565-Seesaw-app-FAQs-for-families-and-students
- https://help.seesaw.me/hc/en-us/articles/7457514926861-Account-Switching-FAQ
- https://help.seesaw.me/hc/en-us/articles/23272332273421-Introduction-to-Seesaw-Administrator-accounts

**Canvas API:**
- https://canvas.instructure.com/doc/api/announcements.html

**Chrome extension management:**
- https://support.google.com/chrome/a/answer/6177431
- https://support.google.com/chrome/a/answer/10405494
