'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { 
  getAdminUsers, 
  createUserWithId, 
  updateUser, 
  deleteUser,
  createAuditLog,
  getUserById,
} from '@/lib/firebase-service';
import { getAuthInstance } from '@/lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { User, UserRole, AdminPermission } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  CheckCircle,
  X,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const AVAILABLE_PERMISSIONS: { id: AdminPermission; label: string; description: string }[] = [
  { id: 'full_access', label: 'Full Access', description: 'Complete system access (Super Admin only)' },
  { id: 'manage_admins', label: 'Manage Admins', description: 'Create and manage admin accounts' },
  { id: 'manage_users', label: 'Manage Users', description: 'Manage borrower accounts' },
  { id: 'manage_investors', label: 'Manage Investors', description: 'Manage investor accounts and capital' },
  { id: 'manage_loans', label: 'Manage Loans', description: 'Approve, disburse, and manage loans' },
  { id: 'manage_payments', label: 'Manage Payments', description: 'Approve and reject payments' },
  { id: 'view_reports', label: 'View Reports', description: 'Access financial reports and analytics' },
  { id: 'manage_settings', label: 'Manage Settings', description: 'Configure system settings' },
  { id: 'view_audit_logs', label: 'View Audit Logs', description: 'Access system audit logs' },
];

export default function AdminManagementPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    role: 'admin' as UserRole,
    permissions: [] as AdminPermission[],
  });

  useEffect(() => {
    const auth = getAuthInstance();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      const userData = await getUserById(user.uid);
      if (!userData || userData.role !== 'super_admin') {
        toast.error('Access denied. Super Admin only.');
        router.push('/dashboard');
        return;
      }
      setCurrentUser(userData);
      loadAdmins();
    });
    return () => unsubscribe();
  }, [router]);

  const loadAdmins = async () => {
    try {
      const adminData = await getAdminUsers();
      setAdmins(adminData);
    } catch (error) {
      console.error('Error loading admins:', error);
      toast.error('Failed to load admin users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    if (!formData.fullName || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const auth = getAuthInstance();
      const { user } = await createUserWithEmailAndPassword(auth, formData.email, formData.password);

      await createUserWithId(user.uid, {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        permissions: formData.permissions,
        isActive: true,
        kycVerified: true,
        createdBy: currentUser?.id,
      });

      await createAuditLog({
        action: 'admin_created',
        entityType: 'user',
        entityId: user.uid,
        performedBy: currentUser?.id || 'system',
        performedByName: currentUser?.fullName || 'System',
        details: { 
          email: formData.email, 
          role: formData.role,
          permissions: formData.permissions,
        },
      });

      toast.success('Admin account created successfully');
      setShowCreateModal(false);
      resetForm();
      loadAdmins();
    } catch (error: unknown) {
      console.error('Error creating admin:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create admin';
      if (errorMessage.includes('email-already-in-use')) {
        toast.error('Email is already registered');
      } else {
        toast.error('Failed to create admin account');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    setIsSubmitting(true);

    try {
      await updateUser(selectedAdmin.id, {
        fullName: formData.fullName,
        phone: formData.phone,
        role: formData.role,
        permissions: formData.permissions,
      });

      await createAuditLog({
        action: 'admin_updated',
        entityType: 'user',
        entityId: selectedAdmin.id,
        performedBy: currentUser?.id || 'system',
        performedByName: currentUser?.fullName || 'System',
        details: { 
          role: formData.role,
          permissions: formData.permissions,
        },
      });

      toast.success('Admin updated successfully');
      setShowEditModal(false);
      resetForm();
      loadAdmins();
    } catch (error) {
      console.error('Error updating admin:', error);
      toast.error('Failed to update admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    if (selectedAdmin.role === 'super_admin') {
      toast.error('Cannot delete super admin account');
      return;
    }

    setIsSubmitting(true);

    try {
      await updateUser(selectedAdmin.id, { isActive: false });

      await createAuditLog({
        action: 'admin_deactivated',
        entityType: 'user',
        entityId: selectedAdmin.id,
        performedBy: currentUser?.id || 'system',
        performedByName: currentUser?.fullName || 'System',
        details: { email: selectedAdmin.email },
      });

      toast.success('Admin deactivated successfully');
      setShowDeleteModal(false);
      setSelectedAdmin(null);
      loadAdmins();
    } catch (error) {
      console.error('Error deactivating admin:', error);
      toast.error('Failed to deactivate admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (admin: User) => {
    setSelectedAdmin(admin);
    setFormData({
      fullName: admin.fullName,
      email: admin.email || '',
      phone: admin.phone || '',
      password: '',
      role: admin.role,
      permissions: admin.permissions || [],
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (admin: User) => {
    setSelectedAdmin(admin);
    setShowDeleteModal(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      password: '',
      role: 'admin',
      permissions: [],
    });
    setSelectedAdmin(null);
  };

  const togglePermission = (permission: AdminPermission) => {
    if (permission === 'full_access') {
      if (formData.permissions.includes('full_access')) {
        setFormData({ ...formData, permissions: [] });
      } else {
        setFormData({ ...formData, permissions: ['full_access'] });
      }
    } else {
      if (formData.permissions.includes('full_access')) return;
      
      const newPermissions = formData.permissions.includes(permission)
        ? formData.permissions.filter(p => p !== permission)
        : [...formData.permissions, permission];
      setFormData({ ...formData, permissions: newPermissions });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A1F44]" />
        </div>
      </DashboardLayout>
    );
  }

  const superAdmins = admins.filter(a => a.role === 'super_admin');
  const regularAdmins = admins.filter(a => a.role === 'admin');

  return (
    <DashboardLayout>
      <Toaster position="top-right" />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
            <p className="text-gray-500 mt-1">Manage administrator accounts and permissions</p>
          </div>
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Admin
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-600 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Super Admins</p>
                <p className="text-2xl font-bold text-gray-900">{superAdmins.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Regular Admins</p>
                <p className="text-2xl font-bold text-gray-900">{regularAdmins.length}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-600 flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Administrator Accounts</h2>
          
          {admins.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No admin accounts found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Created</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((admin) => (
                    <tr key={admin.id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            admin.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            {admin.role === 'super_admin' ? (
                              <ShieldCheck className="h-5 w-5 text-purple-600" />
                            ) : (
                              <Shield className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{admin.fullName}</p>
                            <p className="text-sm text-gray-500">{admin.phone || 'No phone'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{admin.email}</td>
                      <td className="py-3 px-4">
                        <Badge className={admin.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                          {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {admin.isActive ? (
                          <Badge className="bg-green-100 text-green-700">Active</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">Inactive</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{formatDate(admin.createdAt)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(admin)}
                            className="p-1.5 rounded-lg hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-gray-500" />
                          </button>
                          {admin.role !== 'super_admin' && (
                            <button
                              onClick={() => openDeleteModal(admin)}
                              className="p-1.5 rounded-lg hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); resetForm(); }}
        title="Create Admin Account"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <Input
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Enter full name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="admin@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+256 7XX XXX XXX"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Min 6 characters"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.permissions.includes(perm.id)
                      ? 'border-[#00A86B] bg-[#00A86B]/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  } ${perm.id !== 'full_access' && formData.permissions.includes('full_access') ? 'opacity-50' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="mt-1"
                    disabled={perm.id !== 'full_access' && formData.permissions.includes('full_access')}
                  />
                  <div>
                    <p className="font-medium text-gray-900">{perm.label}</p>
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { setShowCreateModal(false); resetForm(); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAdmin}
              isLoading={isSubmitting}
              className="flex-1"
            >
              Create Admin
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); resetForm(); }}
        title="Edit Admin Account"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
            <Input
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <Input
              type="email"
              value={formData.email}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <Select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              disabled={selectedAdmin?.role === 'super_admin'}
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {AVAILABLE_PERMISSIONS.map((perm) => (
                <label
                  key={perm.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.permissions.includes(perm.id)
                      ? 'border-[#00A86B] bg-[#00A86B]/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(perm.id)}
                    onChange={() => togglePermission(perm.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{perm.label}</p>
                    <p className="text-xs text-gray-500">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { setShowEditModal(false); resetForm(); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAdmin}
              isLoading={isSubmitting}
              className="flex-1"
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedAdmin(null); }}
        title="Deactivate Admin"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800">Warning</p>
              <p className="text-sm text-red-600">
                This will deactivate the admin account. They will no longer be able to access the system.
              </p>
            </div>
          </div>
          
          {selectedAdmin && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900">{selectedAdmin.fullName}</p>
              <p className="text-sm text-gray-500">{selectedAdmin.email}</p>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => { setShowDeleteModal(false); setSelectedAdmin(null); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAdmin}
              isLoading={isSubmitting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              Deactivate
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
