import { fireEvent, render } from '@testing-library/react-native';

import { ConfirmDialog } from '../src/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('runs the confirmed action from the in-app dialog', async () => {
    const onConfirm = jest.fn();

    const { getByText } = await render(
      <ConfirmDialog
        visible
        title="Remove account access?"
        message="This account will lose access."
        confirmLabel="Remove access"
        onCancel={jest.fn()}
        onConfirm={onConfirm}
      />,
    );

    await fireEvent.press(getByText('Remove access'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
