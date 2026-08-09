import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { brand } from '../../constants/branding';
import type { StudentFieldDefinition, StudentWithRelations } from '../../types/domain';
import { buildStudentsCsv } from '../../utils/csv';
import { buildStudentPdfHtml, buildStudentsSummaryPdfHtml } from '../../utils/html';

async function shareFile(uri: string, mimeType: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(uri, { mimeType });
  }
}

export async function exportStudentPdf(
  student: StudentWithRelations,
  fields: StudentFieldDefinition[],
): Promise<string> {
  const html = buildStudentPdfHtml(student, fields, brand.name);
  const result = await Print.printToFileAsync({ html });
  await shareFile(result.uri, 'application/pdf');
  return result.uri;
}

export async function exportStudentsPdf(
  title: string,
  students: StudentWithRelations[],
  fields: StudentFieldDefinition[],
): Promise<string> {
  const html = buildStudentsSummaryPdfHtml(title, students, fields, brand.name);
  const result = await Print.printToFileAsync({ html });
  await shareFile(result.uri, 'application/pdf');
  return result.uri;
}

export async function exportStudentsCsv(
  filename: string,
  students: StudentWithRelations[],
  fields: StudentFieldDefinition[],
): Promise<string> {
  const csv = buildStudentsCsv(students, fields);
  const safeFilename = filename.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  const uri = `${FileSystem.documentDirectory ?? ''}${safeFilename}.csv`;
  await FileSystem.writeAsStringAsync(uri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  await shareFile(uri, 'text/csv');
  return uri;
}
