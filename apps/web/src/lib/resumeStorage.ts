import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from './firebase';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = /\.(pdf|doc|docx)$/i;

/**
 * Upload resume to Firebase Storage at `employee-resumes/{uid}/…`.
 * Requires Storage rules allowing authenticated users to write under that prefix.
 */
export async function uploadEmployeeResumeFile(file: File): Promise<{ url: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  if (file.size > MAX_BYTES) throw new Error('File is too large (max 10 MB).');
  if (!ALLOWED_EXT.test(file.name)) {
    throw new Error('Please upload a PDF or Word document (.pdf, .doc, .docx).');
  }
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const path = `employee-resumes/${user.uid}/${Date.now()}_${safe}`;
  const storageRef = ref(storage, path);
  const contentType =
    file.type ||
    (file.name.toLowerCase().endsWith('.docx')
      ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      : file.name.toLowerCase().endsWith('.doc')
        ? 'application/msword'
        : 'application/pdf');
  await uploadBytes(storageRef, file, { contentType });
  const url = await getDownloadURL(storageRef);
  return { url };
}
