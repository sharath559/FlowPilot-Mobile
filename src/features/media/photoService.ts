import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export type StudentPhoto = {
  uri: string;
  width?: number;
  height?: number;
};

export async function compressStudentPhoto(uri: string): Promise<StudentPhoto> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 900 } }], {
    compress: 0.72,
    format: ImageManipulator.SaveFormat.JPEG,
  });

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
  };
}

export async function captureStudentPhoto(): Promise<StudentPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Camera permission is required to capture a student photo.');
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [3, 4],
    quality: 1,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return compressStudentPhoto(result.assets[0].uri);
}

export async function chooseStudentPhoto(): Promise<StudentPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library permission is required to choose a student photo.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [3, 4],
    quality: 1,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return compressStudentPhoto(result.assets[0].uri);
}
