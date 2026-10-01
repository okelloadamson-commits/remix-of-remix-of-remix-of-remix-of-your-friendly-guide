import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, CreditCard, X, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAllUsers, updateUserSubscription, removeUserSubscription, type UserData } from "@/lib/admin-db";
import { format, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { planDurations } from "@/lib/pesapal";

// Build plans array from planDurations
const PLANS = Object.entries(planDurations).map(([name, days]) => ({
  name,
  days,
}));

export default function AdminSubscriptions() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "free">("all");
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [customDays, setCustomDays] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    const data = await getAllUsers();
    setUsers(data);
    setIsLoading(false);
  };

  const isSubscriptionActive = (user: UserData) => {
    return user.subscription?.isActive && 
           user.subscription.expiresAt && 
           new Date(user.subscription.expiresAt) > new Date();
  };

  const getDaysRemaining = (expiresAt: Date) => {
    const days = differenceInDays(new Date(expiresAt), new Date());
    return days > 0 ? days : 0;
  };

  const handleManageSubscription = (user: UserData) => {
    setSelectedUser(user);
    setSelectedPlan(user.subscription?.plan || "");
    setCustomDays("");
    setSubscriptionDialogOpen(true);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedUser || !selectedPlan) return;
    
    const plan = PLANS.find((p) => p.name === selectedPlan);
    if (!plan) return;

    try {
      await updateUserSubscription(selectedUser.id, plan.name, plan.days);
      toast({ title: "Subscription activated successfully!" });
      setSubscriptionDialogOpen(false);
      loadUsers();
    } catch (error) {
      toast({ title: "Error updating subscription", variant: "destructive" });
    }
  };

  const handleCustomDaysSubscription = async () => {
    if (!selectedUser || !customDays) return;
    
    const days = parseInt(customDays);
    if (isNaN(days) || days <= 0) {
      toast({ title: "Please enter a valid number of days", variant: "destructive" });
      return;
    }

    try {
      await updateUserSubscription(selectedUser.id, `Custom (${days} days)`, days);
      toast({ title: `Subscription activated for ${days} days!` });
      setSubscriptionDialogOpen(false);
      loadUsers();
    } catch (error) {
      toast({ title: "Error updating subscription", variant: "destructive" });
    }
  };

  const handleExtendSubscription = async (user: UserData, days: number) => {
    try {
      const currentPlan = user.subscription?.plan || "Monthly";
      await updateUserSubscription(user.id, currentPlan, days);
      toast({ title: `Extended subscription by ${days} days!` });
      loadUsers();
    } catch (error) {
      toast({ title: "Error extending subscription", variant: "destructive" });
    }
  };

  const handleRemoveSubscription = async (userId: string) => {
    if (confirm("Are you sure you want to remove this subscription?")) {
      try {
        await removeUserSubscription(userId);
        toast({ title: "Subscription removed!" });
        loadUsers();
      } catch (error) {
        toast({ title: "Error removing subscription", variant: "destructive" });
      }
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (filter) {
      case "active":
        return isSubscriptionActive(user);
      case "expired":
        return user.subscription && !isSubscriptionActive(user);
      case "free":
        return !user.subscription;
      default:
        return true;
    }
  });

  const stats = {
    total: users.length,
    active: users.filter(isSubscriptionActive).length,
    expired: users.filter((u) => u.subscription && !isSubscriptionActive(u)).length,
    free: users.filter((u) => !u.subscription).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/dashboard">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Manage user subscriptions</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="cursor-pointer bg-[#0d1e36] border-border/50" onClick={() => setFilter("all")}>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Users</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer bg-[#0d1e36] border-green-500/50" onClick={() => setFilter("active")}>
          <CardContent className="p-4">
            <div className="text-sm text-green-500">Active</div>
            <div className="text-2xl font-bold text-green-500">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer bg-[#0d1e36] border-orange-500/50" onClick={() => setFilter("expired")}>
          <CardContent className="p-4">
            <div className="text-sm text-orange-500">Expired</div>
            <div className="text-2xl font-bold text-orange-500">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer bg-[#0d1e36] border-border/50" onClick={() => setFilter("free")}>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Free Users</div>
            <div className="text-2xl font-bold">{stats.free}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="free">Free</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-[#0d1e36] border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Days Left</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">No subscriptions found</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.subscription?.plan || "-"}
                    </TableCell>
                    <TableCell>
                      {isSubscriptionActive(user) ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : user.subscription ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="secondary">Free</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.subscription?.expiresAt
                        ? format(new Date(user.subscription.expiresAt), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {isSubscriptionActive(user) && user.subscription?.expiresAt
                        ? `${getDaysRemaining(user.subscription.expiresAt)} days`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManageSubscription(user)}
                        >
                          <CreditCard className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtendSubscription(user, 7)}
                        >
                          +7d
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExtendSubscription(user, 30)}
                        >
                          +30d
                        </Button>
                        {isSubscriptionActive(user) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => handleRemoveSubscription(user.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Dialog - Full plan selection */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-medium">{selectedUser?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
              {selectedUser?.subscription && isSubscriptionActive(selectedUser) && (
                <div className="mt-2">
                  <Badge className="bg-green-500">{selectedUser.subscription.plan}</Badge>
                  <span className="text-xs text-muted-foreground ml-2">
                    Expires: {format(new Date(selectedUser.subscription.expiresAt), "MMM dd, yyyy")}
                  </span>
                </div>
              )}
            </div>

            {/* All available plans from pesapal */}
            <div className="space-y-2">
              <Label>Select Subscription Plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a plan" />
                </SelectTrigger>
                <SelectContent>
                  {PLANS.map((plan) => (
                    <SelectItem key={plan.name} value={plan.name}>
                      {plan.name} {plan.days === -1 ? "(Lifetime)" : `(${plan.days} days)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleUpdateSubscription} 
                disabled={!selectedPlan}
                className="w-full mt-2"
              >
                Activate Plan
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or custom duration</span>
              </div>
            </div>

            {/* Custom days option */}
            <div className="space-y-2">
              <Label>Custom Days</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter number of days"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  min="1"
                />
                <Button 
                  onClick={handleCustomDaysSubscription}
                  disabled={!customDays}
                  variant="outline"
                >
                  Apply
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
