import { router } from 'expo-router';
import { Text } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Screen } from '../src/components/Screen';

export default function NotFoundScreen() {
  return (
    <Screen title="Not found">
      <Text>This screen does not exist.</Text>
      <AppButton label="Go home" onPress={() => router.replace('/')} />
    </Screen>
  );
}
