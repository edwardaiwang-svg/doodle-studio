// Google Classroom API: the classes a teacher teaches, and posting a video to a class's Classwork.
import { googleFetch } from './auth.js';

const API = 'https://classroom.googleapis.com/v1';

/** Every active class this account teaches: [{ id, name, section, alternateLink }]. Being a teacher of
 *  one of them is the teacher check; "can create classes" proves nothing (admins may allow students to). */
export async function listTeachingCourses(token) {
  const courses = [];
  let pageToken = '';
  do {
    const url = new URL(`${API}/courses`);
    url.search = new URLSearchParams({
      teacherId: 'me', courseStates: 'ACTIVE', pageSize: '100',
      fields: 'courses(id,name,section,alternateLink),nextPageToken',
    });
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const page = await (await googleFetch(token, url)).json();
    for (const { id, name, section = '', alternateLink } of page.courses ?? []) courses.push({ id, name, section, alternateLink });
    pageToken = page.nextPageToken;
  } while (pageToken);
  return courses;
}

/** The course whose Classroom address has this code (the <code> in /c/<code> or /w/<code>/t/all), or null.
 *  Google doesn't document the code, so it is matched against each course's alternateLink; reading it as
 *  base64 of the numeric course id is only a fallback. */
export function courseFromCode(courses, code) {
  if (!code) return null;
  return courses.find((course) => linkCode(course.alternateLink) === code)
    ?? courses.find((course) => course.id === numericId(code))
    ?? null;
}

/** Post a Drive file (the video) to a class's Classwork as a material. state: 'PUBLISHED' or 'DRAFT'. */
export async function postMaterial(token, courseId, { title, description, driveFileId, state = 'PUBLISHED' }) {
  const response = await googleFetch(token, `${API}/courses/${encodeURIComponent(courseId)}/courseWorkMaterials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      ...(description && { description }),
      materials: [{ driveFile: { driveFile: { id: driveFileId }, shareMode: 'VIEW' } }],   // materials only allow VIEW
      state,
    }),
  });
  const material = await response.json();
  return { id: material.id, alternateLink: material.alternateLink, state: material.state };
}

function linkCode(link) {
  try {
    return new URL(link).pathname.match(/\/c\/([^/]+)/)?.[1];
  } catch {
    return undefined;   // a course without a link
  }
}

function numericId(code) {
  try {
    const text = atob(code);
    return /^\d+$/.test(text) ? text : undefined;
  } catch {
    return undefined;   // not base64 at all
  }
}
