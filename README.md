# EDR Real Estate Mastery — Agent Training Platform

## Overview
Online training for new California real estate licensees at EDR Realty Group. 11 planned courses; Courses 1 to 7 are built.

## Platform URL
**https://edrbroker.github.io/EDR-real-estate-mastery**

## Files
| File | Description |
|------|-------------|
| `index.html` | Agent portal, Course 1 (RPA Mastery, 17 lessons + final exam), and the instructor dashboard |
| `edr_shared.js` | Shared sign-in, progress saving, and lesson locking for Courses 2 and up. Every course page needs it. |
| `courseN_lessonM.html` | Lesson pages for Courses 2 to 7 |
| `courseN_final_quiz.html` | Final exams for Courses 2 to 7 |
| `rpa_resources.html` | Agent Resource Hub (unlocks after the Course 1 final exam) |
| `instructor_portal.html`, `rpa_course_v2.html` | Old addresses that redirect to `index.html` |
| `RPA_*.pdf` | Blank RPA, quick reference, glossary, timeline, scenario brief |

## How progression works
- Lessons unlock in order. A lesson quiz needs 4 of 5 to pass.
- A course unlocks when the previous course's final exam is passed and the instructor has the course switched on.
- Instructors switch courses on or off under Instructor Access > Course Management.

## Adding a course
1. Upload the lesson and final exam pages named `courseN_lessonM.html` and `courseN_final_quiz.html`.
2. In `index.html`, add `courseUrl` and `courseKey` to that course in `ALL_COURSES` and set `active:true`.
3. In `edr_shared.js`, add the course number to `DEFAULT_ACTIVE`.

## Alignment
Content is checked against California DRE publications and C.A.R. Form RPA Revised 12/25.

*EDR Realty Group — Internal Use Only*
