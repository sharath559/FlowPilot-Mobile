import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '../src/components/AppButton';
import { Badge } from '../src/components/Badge';
import { Screen } from '../src/components/Screen';
import { Section } from '../src/components/Section';
import { StatusNotice } from '../src/components/StatusNotice';
import { colors, spacing } from '../src/constants/theme';
import { useAppData } from '../src/hooks/useAppData';

export default function SyncScreen() {
  const { isOnline, syncSummary, syncQueueItems, syncNow, retryFailedSync } = useAppData();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [message, setMessage] = useState<{
    tone: 'success' | 'warning' | 'danger' | 'info';
    text: string;
  }>();

  async function runSync() {
    if (isSyncing || isRetrying) {
      return;
    }

    setIsSyncing(true);
    setMessage(undefined);
    try {
      const result = await syncNow();
      setMessage({
        tone: result.failed ? 'danger' : result.skipped ? 'warning' : 'success',
        text: result.message,
      });
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsSyncing(false);
    }
  }

  async function retrySync() {
    if (isSyncing || isRetrying) {
      return;
    }

    setIsRetrying(true);
    setMessage({ tone: 'info', text: 'Resetting failed rows and trying again...' });
    try {
      await retryFailedSync();
      const result = await syncNow();
      setMessage({
        tone: result.failed ? 'danger' : result.skipped ? 'warning' : 'success',
        text: result.message,
      });
    } catch (error) {
      setMessage({ tone: 'danger', text: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <Screen title="Offline sync" subtitle="Every offline write is queued and retried safely with device-generated IDs.">
      <Section title="Connection">
        <Badge label={isOnline ? 'Online' : 'Offline'} tone={isOnline ? 'success' : 'warning'} />
      </Section>

      <Section title="Queue">
        <Text style={styles.stat}>Pending: {syncSummary.pending}</Text>
        <Text style={styles.stat}>Syncing: {syncSummary.syncing}</Text>
        <Text style={styles.stat}>Failed: {syncSummary.failed}</Text>
        <Text style={styles.stat}>Completed: {syncSummary.synced}</Text>
        <Text style={styles.meta}>Last sync: {syncSummary.lastSyncedAt ?? 'Not yet'}</Text>
      </Section>

      <Section title="Recent activity" meta={`${syncQueueItems.length} rows`}>
        {syncQueueItems.length ? (
          syncQueueItems.map((item) => (
            <View key={item.id} style={[styles.queueItem, item.status === 'FAILED' && styles.queueItemFailed]}>
              <View style={styles.queueHeader}>
                <Text style={[styles.queueStatus, item.status === 'FAILED' && styles.queueStatusFailed]}>
                  {item.status}
                </Text>
                <Text style={styles.queueMeta}>{item.operation} · {item.entity}</Text>
              </View>
              <Text style={styles.queueId}>{item.entity_id.slice(0, 8)}</Text>
              {item.last_error ? <Text style={styles.queueError}>{item.last_error}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={styles.meta}>No local queue records yet.</Text>
        )}
      </Section>

      <Section title="Actions">
        <AppButton
          label={isSyncing ? 'Syncing...' : 'Sync now'}
          onPress={() => void runSync()}
          loading={isSyncing}
          disabled={isRetrying || !isOnline}
        />
        <AppButton
          label={isRetrying ? 'Retrying...' : 'Retry failed'}
          onPress={() => void retrySync()}
          variant="secondary"
          loading={isRetrying}
          disabled={isSyncing || !isOnline || syncSummary.failed === 0}
        />
        {message ? <StatusNotice tone={message.tone} text={message.text} /> : null}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 20,
  },
  queueItem: {
    backgroundColor: '#FBFCFB',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  queueItemFailed: {
    backgroundColor: colors.dangerSoft,
    borderColor: '#F3B4B4',
  },
  queueHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  queueStatus: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
  },
  queueStatusFailed: {
    color: colors.danger,
  },
  queueMeta: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textAlign: 'right',
  },
  queueId: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
  },
  queueError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
  },
  stat: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: spacing.xs,
  },
});
