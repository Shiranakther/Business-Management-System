import { useState } from 'react';
import { Plus, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermissions } from '@/hooks/usePermissions';
import { FinanceOverview } from '@/components/finance/FinanceOverview';
import { FinanceExpenses } from '@/components/finance/FinanceExpenses';
import { AddExpenseDialog } from '@/components/dialogs/AddExpenseDialog';
import { Card, CardContent } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';

export default function Finance() {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { canRead, canCreate } = usePermissions();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!canRead('finance')) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Lock className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Access Denied</h2>
        <p className="text-muted-foreground">You don't have permission to view finance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Finance Dashboard</h1>
          <p className="page-description">Financial overview, expense tracking, and payment management.</p>
        </div>
        <div className="flex gap-2">
           {canCreate('finance') && (
            <Button className="gap-2" onClick={() => setShowAddExpense(true)}>
                <Plus className="w-4 h-4" />
                New Expense
            </Button>
           )}
        </div>
      </div>

      {/* Overview Section */}
      <FinanceOverview key={`overview-${refreshTrigger}`} />

      {/* Main Content Tabs */}
      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList className="bg-background border">
          <TabsTrigger value="expenses">Expense Management</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="reports">Financial Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses" className="space-y-6">
           <FinanceExpenses refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Payment History</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                View detailed logs of all incoming and outgoing payments. This module is connected to the Banking API integration.
              </p>
              <Button variant="outline" className="mt-4">Connect Bank Account</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
           <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
               Financial Reports Generation Module (Coming Soon)
            </CardContent>
           </Card>
        </TabsContent>
      </Tabs>

      <AddExpenseDialog 
        open={showAddExpense} 
        onOpenChange={setShowAddExpense} 
        onSuccess={handleRefresh}
      />
    </div>
  );
}
