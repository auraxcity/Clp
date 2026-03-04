'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { BorrowerCard } from '@/components/borrowers/BorrowerCard';
import { BorrowerForm } from '@/components/borrowers/BorrowerForm';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useStore } from '@/store/useStore';
import { getBorrowers } from '@/lib/firebase-service';
import { Borrower, RiskGrade } from '@/types';
import { UserPlus, Search, Filter, Users, AlertTriangle, CheckCircle } from 'lucide-react';

export default function BorrowersPage() {
  const { borrowers, setBorrowers, addBorrower } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    async function loadBorrowers() {
      try {
        const data = await getBorrowers();
        setBorrowers(data);
      } catch (error) {
        console.error('Failed to load borrowers:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadBorrowers();
  }, [setBorrowers]);

  const handleBorrowerCreated = (borrower: Borrower) => {
    addBorrower(borrower);
    setShowAddModal(false);
  };

  const filteredBorrowers = borrowers.filter((borrower) => {
    const matchesSearch =
      borrower.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      borrower.phone.includes(searchQuery) ||
      borrower.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGrade = filterGrade === 'all' || borrower.riskGrade === filterGrade;
    
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'blacklisted' && borrower.isBlacklisted) ||
      (filterStatus === 'active' && !borrower.isBlacklisted && borrower.currentActiveLoanBalance > 0) ||
      (filterStatus === 'good' && !borrower.isBlacklisted && borrower.numberOfDefaults === 0);

    return matchesSearch && matchesGrade && matchesStatus;
  });

  const stats = {
    total: borrowers.length,
    active: borrowers.filter((b) => b.currentActiveLoanBalance > 0).length,
    blacklisted: borrowers.filter((b) => b.isBlacklisted).length,
    goodStanding: borrowers.filter((b) => !b.isBlacklisted && b.numberOfDefaults === 0).length,
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Borrowers</h1>
            <p className="text-gray-500 mt-1">Manage and track all borrower profiles</p>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Borrower
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#0A1F44]/10">
                <Users className="h-5 w-5 text-[#0A1F44]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Borrowers</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Borrowers</p>
                <p className="text-xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Good Standing</p>
                <p className="text-xl font-bold text-gray-900">{stats.goodStanding}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Blacklisted</p>
                <p className="text-xl font-bold text-gray-900">{stats.blacklisted}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, phone, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A1F44] focus:border-transparent"
                />
              </div>
            </div>
            <Select
              options={[
                { value: 'all', label: 'All Grades' },
                { value: 'A', label: 'Grade A' },
                { value: 'B', label: 'Grade B' },
                { value: 'C', label: 'Grade C' },
                { value: 'D', label: 'Grade D' },
                { value: 'F', label: 'Grade F' },
              ]}
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value)}
              className="w-full sm:w-40"
            />
            <Select
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active Loans' },
                { value: 'good', label: 'Good Standing' },
                { value: 'blacklisted', label: 'Blacklisted' },
              ]}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full sm:w-40"
            />
          </div>
        </div>

        {/* Borrowers Grid */}
        {filteredBorrowers.length === 0 ? (
          <div className="bg-white rounded-xl p-12 border border-gray-200 text-center">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No borrowers found</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || filterGrade !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first borrower'}
            </p>
            {!searchQuery && filterGrade === 'all' && filterStatus === 'all' && (
              <Button onClick={() => setShowAddModal(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Borrower
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBorrowers.map((borrower) => (
              <BorrowerCard key={borrower.id} borrower={borrower} />
            ))}
          </div>
        )}

        {/* Add Borrower Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Register New Borrower"
          size="xl"
        >
          <BorrowerForm
            onSuccess={handleBorrowerCreated}
            onCancel={() => setShowAddModal(false)}
          />
        </Modal>
      </div>
    </DashboardLayout>
  );
}
