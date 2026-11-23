/** The school and institute behind the toolkit: every mention of them on the site links here. */
export const SCHOOL = {
  name: "School of Materials Science and Engineering",
  url: "https://nitc.ac.in/department/materials-science-and-engineering",
} as const;

export const INSTITUTE = {
  name: "NIT Calicut",
  url: "https://nitc.ac.in/",
} as const;

/** The 2023 B.Tech project team and guide, with their LinkedIn profiles. */
export const GUIDE = { name: "Dr. Devendra K. Yadav", url: "https://www.linkedin.com/in/devendra-k-yadav-90b15342/" } as const;

export const AUTHORS = [
  { name: "Peeyush Mishra", url: "https://www.linkedin.com/in/peeyush-m/" },
  { name: "Kaushlendra Kumar", url: "https://www.linkedin.com/in/kaushlendra-kumar-/" },
  { name: "Pawe Dhananjay Manohar", url: "https://www.linkedin.com/in/dhananjay-pawe/" },
  { name: "Sushil Kumar Kumhar", url: "https://www.linkedin.com/in/prajapat-sushil/" },
] as const;

export const REPO = {
  url: "https://github.com/mishrapeeyush/SMSE-AI-TOOLKIT-Website",
  thesis: "https://github.com/mishrapeeyush/SMSE-AI-TOOLKIT-Website/blob/main/docs/SMSE_AI_Toolkit_Thesis_2023.pdf",
} as const;

/** Public origin of the site (Vercel production URL when deployed, localhost in development). */
export const siteUrl = () => (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
