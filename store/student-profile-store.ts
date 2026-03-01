import { create } from 'zustand';
import { Student } from '@/types';
import {
  getStudentByEmail,
  getStudentById,
  updateStudent,
} from '@/services/student-service';

type StudentProfileLookup = {
  studentId?: string;
  email?: string;
};

type StudentProfileState = {
  profile: Student | null;
  loading: boolean;
  setProfile: (lookup: StudentProfileLookup) => Promise<void>;
  updateProfile: (patch: Partial<Student>) => Promise<Student | null>;
};

export const useStudentProfileStore = create<StudentProfileState>((set, get) => ({
  profile: null,
  loading: false,
  setProfile: async ({ studentId, email }) => {
    set({ loading: true });
    const normalizedStudentId = studentId?.trim();
    const normalizedEmail = email?.trim().toLowerCase();

    let profile = normalizedStudentId ? await getStudentById(normalizedStudentId) : null;
    if (!profile && normalizedEmail) {
      profile = await getStudentByEmail(normalizedEmail);
    }

    set({ profile, loading: false });
  },
  updateProfile: async (patch) => {
    const current = get().profile;
    if (!current) return null;
    set({ loading: true });
    const updated = await updateStudent(current.id, patch);
    set({ profile: updated, loading: false });
    return updated;
  },
}));
