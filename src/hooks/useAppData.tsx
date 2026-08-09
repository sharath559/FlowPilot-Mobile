import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import {
  getDashboardStats,
  getStudentById,
  getSyncSummary,
  initializeDataStore,
  listAcademicYears,
  listClasses,
  listFieldDefinitions,
  listRecentSyncQueue,
  listSchools,
  listStudents,
  retryFailedQueue,
  saveStudent,
  setSetting,
  upsertAcademicYear,
  upsertClass,
  upsertFieldDefinition,
  upsertSchool,
  deleteStudent,
} from '../database/repositories';
import { processSyncQueue, type SyncRunResult } from '../features/sync/syncService';
import type {
  AcademicYear,
  DashboardStats,
  School,
  SchoolClass,
  StudentFieldDefinition,
  StudentFilters,
  StudentFormInput,
  StudentWithRelations,
  SyncQueueItem,
  SyncSummary,
} from '../types/domain';

type AppDataContextValue = {
  isReady: boolean;
  isOnline: boolean;
  selectedSchoolId?: string;
  selectedClassId?: string;
  schools: School[];
  academicYears: AcademicYear[];
  classes: SchoolClass[];
  fieldDefinitions: StudentFieldDefinition[];
  students: StudentWithRelations[];
  dashboardStats: DashboardStats;
  syncSummary: SyncSummary;
  syncQueueItems: SyncQueueItem[];
  refresh: (filters?: StudentFilters) => Promise<void>;
  selectSchool: (schoolId: string) => Promise<void>;
  selectClass: (classId: string) => Promise<void>;
  createSchool: typeof upsertSchool;
  createAcademicYear: typeof upsertAcademicYear;
  createClass: typeof upsertClass;
  createFieldDefinition: typeof upsertFieldDefinition;
  saveStudentRecord: typeof saveStudent;
  getStudent: typeof getStudentById;
  deleteStudentRecord: typeof deleteStudent;
  syncNow: () => Promise<SyncRunResult>;
  retryFailedSync: () => Promise<void>;
};

const emptyStats: DashboardStats = {
  studentsToday: 0,
  totalStudents: 0,
  pendingSync: 0,
  failedSync: 0,
  classes: 0,
};

const emptySync: SyncSummary = {
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

async function getSecureValue(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function setSecureValue(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    await setSetting(key, value);
  }
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>();
  const [selectedClassId, setSelectedClassId] = useState<string>();
  const [schools, setSchools] = useState<School[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [fieldDefinitions, setFieldDefinitions] = useState<StudentFieldDefinition[]>([]);
  const [students, setStudents] = useState<StudentWithRelations[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>(emptyStats);
  const [syncSummary, setSyncSummary] = useState<SyncSummary>(emptySync);
  const [syncQueueItems, setSyncQueueItems] = useState<SyncQueueItem[]>([]);

  const refresh = useCallback(
    async (filters: StudentFilters = {}) => {
      const nextSchools = await listSchools();
      const nextSelectedSchoolId =
        filters.schoolId ?? selectedSchoolId ?? (await getSecureValue('selected_school_id')) ?? nextSchools[0]?.id;
      const nextSelectedClassId =
        filters.classId ?? selectedClassId ?? (await getSecureValue('selected_class_id')) ?? undefined;

      setSchools(nextSchools);
      setSelectedSchoolId(nextSelectedSchoolId);
      setSelectedClassId(nextSelectedClassId);
      setAcademicYears(await listAcademicYears(nextSelectedSchoolId));
      setClasses(await listClasses(nextSelectedSchoolId));
      setFieldDefinitions(await listFieldDefinitions(nextSelectedSchoolId));
      setStudents(
        await listStudents({
          schoolId: filters.schoolId ?? nextSelectedSchoolId,
          classId: filters.classId,
          academicYearId: filters.academicYearId,
          recordDate: filters.recordDate,
          search: filters.search,
        }),
      );
      setDashboardStats(await getDashboardStats());
      setSyncSummary(await getSyncSummary());
      setSyncQueueItems(await listRecentSyncQueue());
      setIsReady(true);
    },
    [selectedClassId, selectedSchoolId],
  );

  useEffect(() => {
    let mounted = true;

    initializeDataStore()
      .then(async () => {
        if (mounted) {
          await refresh();
        }
      })
      .catch(() => {
        if (mounted) {
          setIsReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online && isReady) {
        await processSyncQueue();
        await refresh();
      }
    });

    return unsubscribe;
  }, [isReady, refresh]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      isReady,
      isOnline,
      selectedSchoolId,
      selectedClassId,
      schools,
      academicYears,
      classes,
      fieldDefinitions,
      students,
      dashboardStats,
      syncSummary,
      syncQueueItems,
      refresh,
      selectSchool: async (schoolId: string) => {
        setSelectedSchoolId(schoolId);
        await setSecureValue('selected_school_id', schoolId);
        await refresh({ schoolId });
      },
      selectClass: async (classId: string) => {
        setSelectedClassId(classId);
        await setSecureValue('selected_class_id', classId);
      },
      createSchool: upsertSchool,
      createAcademicYear: upsertAcademicYear,
      createClass: upsertClass,
      createFieldDefinition: upsertFieldDefinition,
      saveStudentRecord: async (input: StudentFormInput) => {
        const student = await saveStudent(input);
        const filters = { schoolId: input.school_id, classId: input.class_id ?? undefined };
        await refresh(filters);

        if (isOnline) {
          await processSyncQueue();
          await refresh(filters);
          return (await getStudentById(student.id)) ?? student;
        }

        return student;
      },
      getStudent: getStudentById,
      deleteStudentRecord: async (id: string) => {
        await deleteStudent(id);
        await refresh();
      },
      syncNow: async () => {
        const result = await processSyncQueue();
        await refresh();
        return result;
      },
      retryFailedSync: async () => {
        await retryFailedQueue();
        await refresh();
      },
    }),
    [
      academicYears,
      classes,
      dashboardStats,
      fieldDefinitions,
      isOnline,
      isReady,
      refresh,
      schools,
      selectedClassId,
      selectedSchoolId,
      students,
      syncSummary,
      syncQueueItems,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const value = useContext(AppDataContext);
  if (!value) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return value;
}
