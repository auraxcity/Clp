'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface DebugData {
  borrowers: any[];
  users: any[];
  loans: any[];
}

export default function DebugPage() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const db = getDb();
      
      const borrowersSnapshot = await getDocs(collection(db, 'borrowers'));
      const borrowers = borrowersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      const loansSnapshot = await getDocs(collection(db, 'loans'));
      const loans = loansSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      setData({ borrowers, users, loans });
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('Error loading data: ' + (error as Error).message);
    }
    setLoading(false);
  };

  const fixLoanBorrowerId = async (loanId: string, newBorrowerId: string) => {
    setUpdating(true);
    try {
      const db = getDb();
      await updateDoc(doc(db, 'loans', loanId), {
        borrowerId: newBorrowerId,
        updatedAt: new Date()
      });
      setMessage(`Successfully updated loan ${loanId} with borrowerId ${newBorrowerId}`);
      await loadData();
    } catch (error) {
      setMessage('Error updating loan: ' + (error as Error).message);
    }
    setUpdating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  const kuleLoans = data?.loans.filter(l => 
    l.borrowerName?.toLowerCase().includes('kule') || 
    l.borrowerName?.toLowerCase().includes('crescent')
  ) || [];

  const kuleUsers = data?.users.filter(u => 
    u.fullName?.toLowerCase().includes('kule') || 
    u.fullName?.toLowerCase().includes('crescent') ||
    u.email?.toLowerCase().includes('kule')
  ) || [];

  const kuleBorrowers = data?.borrowers.filter(b => 
    b.fullName?.toLowerCase().includes('kule') || 
    b.fullName?.toLowerCase().includes('crescent')
  ) || [];

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-2xl font-bold mb-6">Database Debug Tool</h1>
      
      {message && (
        <div className="mb-4 p-4 bg-blue-100 border border-blue-300 rounded">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-4">
          <h2 className="font-bold text-lg mb-2">Summary</h2>
          <p>Total Users: {data?.users.length}</p>
          <p>Total Borrowers: {data?.borrowers.length}</p>
          <p>Total Loans: {data?.loans.length}</p>
          <p>Active Loans: {data?.loans.filter(l => ['active', 'due_soon', 'late'].includes(l.status)).length}</p>
        </Card>
        
        <Card className="p-4">
          <h2 className="font-bold text-lg mb-2">Kule/Crescent Search</h2>
          <p>Matching Users: {kuleUsers.length}</p>
          <p>Matching Borrowers: {kuleBorrowers.length}</p>
          <p>Matching Loans: {kuleLoans.length}</p>
        </Card>

        <Card className="p-4">
          <Button onClick={loadData} disabled={loading}>
            Refresh Data
          </Button>
        </Card>
      </div>

      {/* Kule Users */}
      <Card className="p-4 mb-6">
        <h2 className="font-bold text-lg mb-4">Users matching "Kule" or "Crescent"</h2>
        {kuleUsers.length === 0 ? (
          <p className="text-gray-500">No users found with name containing "Kule" or "Crescent"</p>
        ) : (
          <div className="space-y-2">
            {kuleUsers.map(user => (
              <div key={user.id} className="p-3 bg-green-50 border border-green-200 rounded">
                <p><strong>User ID (Firebase UID):</strong> <code className="bg-gray-100 px-1">{user.id}</code></p>
                <p><strong>Name:</strong> {user.fullName}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Phone:</strong> {user.phone}</p>
                <p><strong>Role:</strong> {user.role}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Kule Borrowers */}
      <Card className="p-4 mb-6">
        <h2 className="font-bold text-lg mb-4">Borrowers matching "Kule" or "Crescent"</h2>
        {kuleBorrowers.length === 0 ? (
          <p className="text-gray-500">No borrowers found</p>
        ) : (
          <div className="space-y-2">
            {kuleBorrowers.map(borrower => (
              <div key={borrower.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p><strong>Borrower ID:</strong> <code className="bg-gray-100 px-1">{borrower.id}</code></p>
                <p><strong>Name:</strong> {borrower.fullName}</p>
                <p><strong>Email:</strong> {borrower.email}</p>
                <p><strong>Phone:</strong> {borrower.phone}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Kule Loans */}
      <Card className="p-4 mb-6">
        <h2 className="font-bold text-lg mb-4">Loans for "Kule" or "Crescent"</h2>
        {kuleLoans.length === 0 ? (
          <p className="text-gray-500">No loans found</p>
        ) : (
          <div className="space-y-4">
            {kuleLoans.map(loan => {
              const matchingUser = kuleUsers.find(u => u.id === loan.borrowerId);
              const needsFix = !matchingUser && kuleUsers.length > 0;
              
              return (
                <div key={loan.id} className={`p-3 rounded border ${needsFix ? 'bg-red-50 border-red-300' : 'bg-blue-50 border-blue-200'}`}>
                  <p><strong>Loan ID:</strong> <code className="bg-gray-100 px-1">{loan.id}</code></p>
                  <p><strong>Borrower Name:</strong> {loan.borrowerName}</p>
                  <p><strong>Current BorrowerId:</strong> <code className="bg-gray-100 px-1">{loan.borrowerId}</code></p>
                  <p><strong>Status:</strong> <span className={`px-2 py-0.5 rounded text-sm ${
                    loan.status === 'active' ? 'bg-green-200' : 
                    loan.status === 'pending' ? 'bg-yellow-200' : 
                    loan.status === 'late' ? 'bg-red-200' : 'bg-gray-200'
                  }`}>{loan.status}</span></p>
                  <p><strong>Amount:</strong> UGX {loan.principalAmount?.toLocaleString()}</p>
                  <p><strong>Outstanding:</strong> UGX {loan.outstandingBalance?.toLocaleString()}</p>
                  
                  {needsFix && (
                    <div className="mt-3 p-2 bg-red-100 rounded">
                      <p className="text-red-700 font-medium mb-2">
                        ⚠️ BorrowerId mismatch! The loan's borrowerId ({loan.borrowerId}) doesn't match any user's UID.
                      </p>
                      {kuleUsers.map(user => (
                        <Button
                          key={user.id}
                          onClick={() => fixLoanBorrowerId(loan.id, user.id)}
                          disabled={updating}
                          className="mr-2 bg-red-600 hover:bg-red-700"
                        >
                          Fix: Set borrowerId to {user.fullName}'s UID ({user.id.substring(0, 8)}...)
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {matchingUser && (
                    <p className="mt-2 text-green-600">✓ BorrowerId correctly matches user UID</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* All Loans */}
      <Card className="p-4 mb-6">
        <h2 className="font-bold text-lg mb-4">All Loans ({data?.loans.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Loan ID</th>
                <th className="text-left p-2">Borrower Name</th>
                <th className="text-left p-2">BorrowerId</th>
                <th className="text-left p-2">Status</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.loans.map(loan => {
                const hasMatchingUser = data.users.some(u => u.id === loan.borrowerId);
                return (
                  <tr key={loan.id} className={`border-b ${!hasMatchingUser ? 'bg-red-50' : ''}`}>
                    <td className="p-2"><code className="text-xs">{loan.id.substring(0, 8)}...</code></td>
                    <td className="p-2">{loan.borrowerName}</td>
                    <td className="p-2"><code className="text-xs">{loan.borrowerId?.substring(0, 12)}...</code></td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        loan.status === 'active' ? 'bg-green-200' : 
                        loan.status === 'pending' ? 'bg-yellow-200' : 
                        loan.status === 'late' ? 'bg-red-200' : 'bg-gray-200'
                      }`}>{loan.status}</span>
                    </td>
                    <td className="p-2">UGX {loan.principalAmount?.toLocaleString()}</td>
                    <td className="p-2">
                      {!hasMatchingUser && (
                        <span className="text-red-600 text-xs">No matching user</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* All Users */}
      <Card className="p-4">
        <h2 className="font-bold text-lg mb-4">All Users ({data?.users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">User ID (UID)</th>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Email</th>
                <th className="text-left p-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {data?.users.map(user => (
                <tr key={user.id} className="border-b">
                  <td className="p-2"><code className="text-xs">{user.id}</code></td>
                  <td className="p-2">{user.fullName}</td>
                  <td className="p-2">{user.email}</td>
                  <td className="p-2">{user.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
