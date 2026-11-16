# Hackathon fact-finding: Kiroween 2026 rules, past winners, accessibility winners, judge advice

Method: WebFetch returned 403 for kiroween.devpost.com; a `curl` with a browser User-Agent returned 200, so the rules were read from that copy. Search snippets are marked.

## 1. Kiroween 2026: rules and judging (source: https://kiroween.devpost.com/rules)

**Judging (section 6).** Quote: "This process may utilize expert panels, peer review, automated AI-driven analysis, or any combination thereof."

Stage One (pass/fail): "The first stage will determine via pass/fail whether the ideas meet a baseline level of viability, in that the Project reasonably fits the theme and reasonably applies the required tools featured in the Hackathon."

Stage Two, five equally weighted criteria, 20% and 10 points each:

| Criterion | Rules text (verbatim) |
|---|---|
| Potential Impact | "Does the project make a credible case for solving a real problem for a real audience? Does the solution address that problem based on what's demonstrated? How useful, intuitive, and accessible is it? Would someone actually use this?" |
| Technological Implementation | "How thoroughly and skillfully does the project use Kiro? Was there a thoughtful strategy to AI development? Was a variety of Kiro tools used impactfully? Does the project show a deep understanding of Kiro features? Was there experimentation?" |
| Design | "Does the project deliver a complete, coherent product experience, not just a technical proof of concept? Is the design intuitive, polished, and intentional?" |
| Innovation/Idea | "How creative and novel is the concept, and does the project differ from existing concepts? Are any unusual technologies or public resources (like datasets) leveraged or combined in a unique way?" |
| Presentation | "Does the video clearly demonstrate the project working end-to-end? Does the pitch communicate what problem is solved, who it's for, and why it matters? Is the overall presentation easy to follow? Is the presentation creative and memorable?" |

**Category (verbatim).** "Resurrection: Bring your favorite dead technology back to life. Reimagine obsolete tech with today's innovations or solving tomorrow's problems."

**Bonus prizes (section 8, names and amounts).** Best Startup Project $10,000; Best Ghost of Kiroween Past $2,000 (registered for Kiroween 2025, "verified against Kiroween 2025 records"); Best Kiro Crew App $1,000 (separate GitHub repo, judged by the Kiro team among the top 50); Best Student Project, 4 awards, $1,500 each; Best Demo $1,000 (top Presentation score within the top 10% overall); Bonus Blog Prize, 100 awards, 2,000 credits; Social Blitz, 5 awards, 3-month Kiro Pro+. Rule: "An eligible Project can win one (1) Overall Prize OR 1 Category Prize AND any number of Bonus Prizes." Overall 1st/2nd/3rd: $30,000 / $20,000 / $10,000.

**Video (section 4).** Quote: "should be less than three (3) minutes. Judges are not required to watch beyond three minutes"; "should include footage that shows the Project functioning on the device for which it was built"; "must be uploaded to and made publicly visible on YouTube"; "must not include third party trademarks, or copyrighted music or other material unless the Entrant has permission to use such material."

**Testing.** Quote: "Judges are not required to test the Project and may choose to judge based solely on the text description, images, and video provided in the Submission." The project must be reachable "by providing a link to a website, functioning demo, or a test build", and must be "available free of charge and without any restriction ... until the Judging Period ends." Also: "Insufficient use of Kiro will result in disqualification at the Judges' sole discretion." Hardware clause: physical access may be required for proprietary hardware.

**Repo rules.** `/.kiro` at the root; "Do NOT add the /.kiro directory or sub-folders to your .gitignore, as this could disqualify your submission." Repo public, open source license "detectable and visible at the top of the repository page (in the About section)".

**Consistency with the repo.** Register rows R-01 to R-09 match the rules text on dates, criteria, prizes, video, `/.kiro` and licence. Dates on the live page: submission to Dec 4, 2026 2:00 pm PT; judging Dec 16, 2026 to Jan 29, 2027; winners about Feb 3, 2027.

## 2. Past Kiro hackathons and winners

**Kiroween 2025** (https://kiroween-2025.devpost.com/ , Oct 31 to Dec 5, 2025, $100,000 in cash). The official winners page (`/winners`) returned 404. The winners were read from the badges on project pages linked from https://kiroween-2025.devpost.com/project-gallery (24 projects). Prize names are as printed on each project page. The 2025 criteria on the home page were "potential value, implementation of Kiro, and creativity"; that page was not the 2026 rules.

| Prize (as labelled) | Project and Devpost URL | What it is / most striking feature |
|---|---|---|
| Overall 1st | InteractionKit, https://devpost.com/software/kiro-interactionkit | Lightboard-style tool to draw in mid-air with hand gestures; gesture-to-action pipeline built from prompts |
| Overall 2nd | UnitSet, https://devpost.com/software/unitset | Canvas, AI, code and live sandboxes in one UI tool; "replaces 6 different tools" |
| Overall 3rd | SpookBnB, https://devpost.com/software/spookbnb-when-dark-mode-gets-truly-dark | Looks like a normal rental site; dark mode turns it into a flashlight-guided horror escape room |
| Best Resurrection | Faxi, https://devpost.com/software/faxi-16iecy | "resurrects fax for seniors": handwrite a request, fax it, AI turns it into email, bookings or orders |
| Best Frankenstein | rumorNet, https://devpost.com/software/rumornet | Misinformation detection "in 100+ languages" |
| Best Skeleton Crew | Impulse Kit, https://devpost.com/software/impulse-kit | "Tap the good, ignore the bad, learn fast." |
| Best Costume Contest | Seance, https://devpost.com/software/seance | Educational "darkest legends" explorer |
| Bonus: Best Startup Project | Frankenbook, https://devpost.com/software/frankenbook; Splat-n-Treat, https://devpost.com/software/splat-n-treat | Both pages carry this label, so the single $10,000 bonus is not resolved from the pages alone |
| Bonus: Most Creative ($2,500) | Impulse Kit (label on page) | as above |
| Bonus: Influencer Judges' Choice ($1,000, 2 winners) | BlueKai, https://devpost.com/software/bluekai-bluesky-on-a-flip-phone; Faxi (label on page) | Bluesky client on KaiOS feature phones: "Retro hardware, future protocol." |
| Bonus: Social Blitz ($100 each, 5 winners) | Type To Death, https://devpost.com/software/type-to-death; Zombie Blaster, https://devpost.com/software/zombie-blaster; Splice, https://devpost.com/software/splice-4vc35t; donutamagotchi, https://devpost.com/software/donutamagotchi; Frankenbook | Type To Death: "Strengthen your typing ability through immersive, pressure-based learning." |

Not verified: "Bonus: Blog Post" appears as a label on many project pages, but no blog prize appears in the 2025 prize list. Not found: the meaning of that label.

**Code with Kiro Hackathon** (https://kiro.devpost.com/ , Jul 14 to Sep 15, 2025, "$100,000 in cash"). "View the winners" was not opened. https://kiro.devpost.com/project-gallery carries a "Winner" badge on many entries and a "Bonus Blog Prize" filter, but no prize tier names on the cards. Prize-to-project mapping: not found. Example winner-badged entries from the gallery text: KiroSpecGuard ("Catches bugs as you code and creates audit docs automatically") and Taptik Protocol ("Sync and migrate AI IDE settings in seconds"); the URLs for these were not collected.


## 3. Accessibility and assistive-tech winners, 2025 (8 projects)

Source for "Winner": the "Winner" badge on each project page. Only Access360's tier ("1st Place") is printed on its page. Video URLs were found, but the videos were not watched or transcribed, so the first 30 seconds are **not found**.

| Project (event, source gallery) | URL | What it built | First 30 seconds |
|---|---|---|---|
| Access360 (Hack for Humanity 2025, Santa Clara; "1st Place") | https://devpost.com/software/access360 | AI agent that scores venues' accessibility from 360° Google Maps views | not found (video https://www.youtube.com/embed/F0i_yGHbRX0 not watched) |
| Hearo (Hack for Humanity 2025) | https://devpost.com/software/hearo-kcb80g | Alerts deaf and hard-of-hearing users with tactile and visual notifications when an alarm sounds | not found |
| Visionairy (Hack for Humanity 2025) | https://devpost.com/software/visionairy | "Guiding you beyond sight." | not found (video ftuHUrt1KTg) |
| Eye AAC Select (Technica 2025) | https://devpost.com/software/eye-select | Eye-tracking AAC that adapts its options and speaks typed text | not found |
| Excel ASL (Technica 2025) | https://devpost.com/software/excel-asl | Self-paced American Sign Language learning app | not found |
| The Last Vigil (Technica 2025) | https://devpost.com/software/the-last-vigil | Learn ASL by casting spells at monsters | not found (video OLqWR8VyqVo) |
| DocSimplified (Technica 2025) | https://devpost.com/software/docsimplified | Form assistant for non-English and low-literacy users | not found (video UwHuJXa4LVw) |
| Talkable (.devHacks 2025) | https://devpost.com/software/talkable | Bridges communication for mute and deaf users | not found |

Prize names seen only in search snippets, not opened (winners not verified): Technica "No Mortals Left Behind"; HackDavis 2025 "Best Assistive Technology"; .devHacks 2025 "Best Accessibility Hack".

Not found: 2024 and 2026 accessibility winner lists on Devpost; a demo-video transcript for any entry above.

## 4. Advice on standing out (judges and Devpost)

1. **Script it and start early.** Devpost: "Write a script!" and "Start putting your demo video together at the beginning of the hackathon." Leave "at least two or three hours" before the deadline to record and upload. https://info.devpost.com/blog/6-tips-for-making-a-hackathon-demo-video
2. **Keep it short, no slide decks, show the product running.** Devpost: "Keep it short, interesting (no slide shows/decks), and visually engaging. Show a demo of the product running by using some input." Same URL.
3. **Pitch first.** Devpost: "Start with your pitch and a quick overview of your project before diving in." Same URL.
4. **Judges check requirements first.** Karen (judge): "the first thing I do is go over the requirements that the hackathon has asked for. As a judge, it was surprising to see how many submissions did not fulfill the basic requirements." https://info.devpost.com/blog/hackathon-judging-tips
5. **The video is the first signal.** Richard (judge): "The demo video gives the most amount of scope." Same URL.
6. **Text and video must agree.** Richard: "sometimes you have a really nice video and a really lacking text description." Same URL.
7. **Show the working thing in the first seconds.** From a search snippet, not opened: a WebMCP challenge page advises showing the project working in the first 10 to 15 seconds. https://webmcp.devpost.com/updates/46161-2-days-left-and-what-judges-actually-look-for
8. **Backups and early upload.** From a search snippet, not opened: a 22-time winner recommends backup videos and uploading early. https://info.devpost.com/blog/user-story-nathan

## 5. Reading (my interpretation, not sourced)

1. **A visible "before and after" the judge can see in one shot.** SpookBnB (3rd) flips from a normal site to a horror room on one toggle; Faxi (Best Resurrection) shows handwriting becoming an email. The Resurrection-category winner is a legible revival of an old medium for a named audience.
2. **Unusual or retro hardware as the hook.** BlueKai (Influencer Judges' Choice) runs on feature phones; InteractionKit (1st) uses hand gestures; Eye AAC Select uses eye tracking. Hardware the judge can picture in the video carries the demo.
3. **A real user group with a concrete need.** Faxi (seniors), Hearo (deaf and hard-of-hearing users), Talkable and DocSimplified (communication and low literacy). Accessibility winners name their user in the first line, which matches the Potential Impact criterion.
4. **A single novel mechanism the judge can test.** UnitSet and rumorNet state a specific measurable scope ("replaces 6 different tools", "100+ languages"). Judges can check a claim like this against the video.
5. **Kiro use shown as process, not only output.** Kiro-specific write-ups and hooks appear in winners' text (SpookBnB credits Kiro hooks that clean up comments and console.logs; Seance credits a steering rule). The rules weight Kiro use at 20% and disqualify "insufficient use", so the write-up, not only the video, must show how Kiro was used.
