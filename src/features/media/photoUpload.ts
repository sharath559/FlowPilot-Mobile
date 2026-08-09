import * as FileSystem from 'expo-file-system/legacy';

import { supabase } from '../../services/supabaseClient';
import type { Student } from '../../types/domain';

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function uploadStudentPhoto(student: Student): Promise<string | null> {
  if (!student.photo_local_path) {
    return null;
  }

  const base64 = await FileSystem.readAsStringAsync(student.photo_local_path, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const fileBytes = base64ToUint8Array(base64);
  const path = `organizations/${student.organization_id}/schools/${student.school_id}/students/${student.id}/profile.jpg`;

  const { error } = await supabase.storage.from('student-photos').upload(path, fileBytes, {
    contentType: 'image/jpeg',
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}
