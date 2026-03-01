'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import { useAuthStore } from '@/store/auth-store';
import { useStudentProfileStore } from '@/store/student-profile-store';
import { useToastStore } from '@/store/toast-store';
import { profileSchema } from '@/utils/validators';

type ProfileValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
});

type PasswordValues = z.infer<typeof passwordSchema>;

export default function StudentProfilePage() {
  const user = useAuthStore((state) => state.user);
  const profile = useStudentProfileStore((state) => state.profile);
  const setProfile = useStudentProfileStore((state) => state.setProfile);
  const updateProfile = useStudentProfileStore((state) => state.updateProfile);
  const pushToast = useToastStore((state) => state.push);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      mobile: '',
      email: '',
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!user?.studentId && !user?.email) return;
    setProfile({
      studentId: user.studentId,
      email: user.email,
    });
  }, [user?.studentId, user?.email, setProfile]);

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        name: profile.name,
        mobile: profile.mobile,
        email: profile.email,
      });
      return;
    }

    if (user?.name || user?.email) {
      profileForm.reset({
        name: user?.name || '',
        mobile: '',
        email: user?.email || '',
      });
    }
  }, [profile, profileForm, user?.name, user?.email]);

  return (
    <PageTransition>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
            <p className="text-sm text-slate-500">
              Update personal information and security settings.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Link href="/student/dashboard">
              <Button variant="outline" className="h-9 px-3">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tests
              </Button>
            </Link>
            
            <a href="http://localhost:3000" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-9 px-3">
                <ExternalLink className="h-4 w-4 mr-2" />
                Main
              </Button>
            </a>
            
            <a href="http://localhost:3013" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="h-9 px-3">
                <ExternalLink className="h-4 w-4 mr-2" />
                Courses
              </Button>
            </a>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Basic Info</h2>
            <form
              className="space-y-3"
              onSubmit={profileForm.handleSubmit(async (values) => {
                const updatedProfile = await updateProfile(values);
                if (!updatedProfile) {
                  pushToast({
                    kind: 'error',
                    title: 'Profile not found',
                    description: 'Student profile could not be loaded.',
                  });
                  return;
                }
                pushToast({ kind: 'success', title: 'Profile updated' });
              })}
            >
              <Input {...profileForm.register('name')} placeholder="Name" />
              <Input {...profileForm.register('mobile')} placeholder="Mobile" />
              <Input {...profileForm.register('email')} placeholder="Email" />
              <div className="flex justify-end">
                <Button type="submit">Save Profile</Button>
              </div>
            </form>
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">Change Password</h2>
            <form
              className="space-y-3"
              onSubmit={passwordForm.handleSubmit((values) => {
                if (values.newPassword !== values.confirmPassword) {
                  pushToast({
                    kind: 'error',
                    title: 'Password mismatch',
                    description: 'Confirm password must match new password.',
                  });
                  return;
                }
                pushToast({
                  kind: 'success',
                  title: 'Password changed',
                  description: 'Password update main app auth flow se handle hota hai.',
                });
                passwordForm.reset();
              })}
            >
              <Input
                type="password"
                {...passwordForm.register('currentPassword')}
                placeholder="Current password"
              />
              <Input
                type="password"
                {...passwordForm.register('newPassword')}
                placeholder="New password"
              />
              <Input
                type="password"
                {...passwordForm.register('confirmPassword')}
                placeholder="Confirm password"
              />
              <div className="flex justify-end">
                <Button type="submit">Update Password</Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}
