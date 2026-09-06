import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

import { API_BASE_URL } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const getHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return { Authorization: `Bearer ${session?.access_token}` };
};

export function PayrollSettingsPanel() {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    working_days_per_month: 26,
    working_hours_per_day: 8,
    epf_employee_rate: 8,
    epf_employer_rate: 12,
    etf_employer_rate: 3,
    no_pay_full_day_deduction: 0,
    no_pay_half_day_deduction: 0,
    late_arrival_deduction_amount: 0,
    grace_period_minutes: 15,
    max_late_marks_per_month: 3,
    normal_ot_multiplier: 1.5,
    holiday_ot_multiplier: 2.0,
    special_ot_multiplier: 2.5,
    double_ot_multiplier: 3.0,
    monthly_ot_budget: 0,
    default_annual_leave: 14,
    default_casual_leave: 7,
    default_medical_leave: 7,
    default_short_leave: 4,
    leave_year_start_month: 1,
    leave_year_start_day: 1,
    carry_forward_enabled: false,
    max_carry_forward_days: 0,
    gratuity_eligible_years: 5,
  });

  const [leaveTiers, setLeaveTiers] = useState<any[]>([]);
  const [gratuitySettings, setGratuitySettings] = useState<any[]>([]);

  useEffect(() => {
    fetchSettings();
    fetchLeaveTiers();
    fetchGratuitySettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/hr/settings`, { headers });
      if (res.data) setSettings(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load settings");
    }
  };

  const fetchLeaveTiers = async () => {
    try {
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/hr/leave-tiers`, { headers });
      if (res.data) setLeaveTiers(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load leave tiers");
    }
  };

  const fetchGratuitySettings = async () => {
    try {
      const headers = await getHeaders();
      const res = await axios.get(`${API_BASE_URL}/api/hr/gratuity-settings`, { headers });
      if (res.data) setGratuitySettings(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load gratuity settings");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, carry_forward_enabled: checked }));
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const headers = await getHeaders();
      await axios.put(`${API_BASE_URL}/api/hr/settings`, settings, { headers });
      await axios.put(`${API_BASE_URL}/api/hr/leave-tiers`, leaveTiers, { headers });
      await axios.put(`${API_BASE_URL}/api/hr/gratuity-settings`, gratuitySettings, { headers });
      toast.success("Settings saved successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  const addLeaveTier = () => {
    setLeaveTiers([...leaveTiers, { year_from: 0, year_to: 0, annual: 0, casual: 0, medical: 0, short: 0 }]);
  };

  const updateLeaveTier = (index: number, field: string, value: number) => {
    const newTiers = [...leaveTiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setLeaveTiers(newTiers);
  };

  const removeLeaveTier = (index: number) => {
    setLeaveTiers(leaveTiers.filter((_, i) => i !== index));
  };

  const addGratuitySetting = () => {
    setGratuitySettings([...gratuitySettings, { year_from: 0, year_to: 0, amount_per_year: 0, type: 'Fixed' }]);
  };

  const updateGratuitySetting = (index: number, field: string, value: any) => {
    const newSettings = [...gratuitySettings];
    newSettings[index] = { ...newSettings[index], [field]: value };
    setGratuitySettings(newSettings);
  };

  const removeGratuitySetting = (index: number) => {
    setGratuitySettings(gratuitySettings.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">HR & Payroll Settings</h2>
        <Button onClick={handleSaveSettings} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Section 1: Working Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Working Schedule</CardTitle>
            <CardDescription>Default working days and hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="working_days_per_month">Working Days/Month</Label>
                <Input type="number" id="working_days_per_month" name="working_days_per_month" value={settings.working_days_per_month} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="working_hours_per_day">Working Hours/Day</Label>
                <Input type="number" id="working_hours_per_day" name="working_hours_per_day" value={settings.working_hours_per_day} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Statutory Contributions */}
        <Card>
          <CardHeader>
            <CardTitle>Statutory Contributions</CardTitle>
            <CardDescription>EPF / ETF Rates (%)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="epf_employee_rate">EPF Employee</Label>
                <Input type="number" id="epf_employee_rate" name="epf_employee_rate" value={settings.epf_employee_rate} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="epf_employer_rate">EPF Employer</Label>
                <Input type="number" id="epf_employer_rate" name="epf_employer_rate" value={settings.epf_employer_rate} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="etf_employer_rate">ETF Employer</Label>
                <Input type="number" id="etf_employer_rate" name="etf_employer_rate" value={settings.etf_employer_rate} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Deduction Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Deduction Rules</CardTitle>
            <CardDescription>Rules for deductions and late arrivals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="no_pay_full_day_deduction">No-Pay Full Day (0=Auto)</Label>
                <Input type="number" id="no_pay_full_day_deduction" name="no_pay_full_day_deduction" value={settings.no_pay_full_day_deduction} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="no_pay_half_day_deduction">No-Pay Half Day (0=Auto)</Label>
                <Input type="number" id="no_pay_half_day_deduction" name="no_pay_half_day_deduction" value={settings.no_pay_half_day_deduction} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="late_arrival_deduction_amount">Late Arrival Deduction Amount</Label>
                <Input type="number" id="late_arrival_deduction_amount" name="late_arrival_deduction_amount" value={settings.late_arrival_deduction_amount} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grace_period_minutes">Grace Period (Minutes)</Label>
                <Input type="number" id="grace_period_minutes" name="grace_period_minutes" value={settings.grace_period_minutes} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_late_marks_per_month">Max Late Marks/Month</Label>
                <Input type="number" id="max_late_marks_per_month" name="max_late_marks_per_month" value={settings.max_late_marks_per_month} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Overtime Rates */}
        <Card>
          <CardHeader>
            <CardTitle>Overtime Rates</CardTitle>
            <CardDescription>Multipliers and Budget</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="normal_ot_multiplier">Normal OT Multiplier</Label>
                <Input type="number" step="0.1" id="normal_ot_multiplier" name="normal_ot_multiplier" value={settings.normal_ot_multiplier} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="holiday_ot_multiplier">Holiday OT Multiplier</Label>
                <Input type="number" step="0.1" id="holiday_ot_multiplier" name="holiday_ot_multiplier" value={settings.holiday_ot_multiplier} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="special_ot_multiplier">Special OT Multiplier</Label>
                <Input type="number" step="0.1" id="special_ot_multiplier" name="special_ot_multiplier" value={settings.special_ot_multiplier} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="double_ot_multiplier">Double OT Multiplier</Label>
                <Input type="number" step="0.1" id="double_ot_multiplier" name="double_ot_multiplier" value={settings.double_ot_multiplier} onChange={handleChange} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="monthly_ot_budget">Monthly OT Budget (LKR)</Label>
                <Input type="number" id="monthly_ot_budget" name="monthly_ot_budget" value={settings.monthly_ot_budget} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Default Leave Entitlements */}
        <Card>
          <CardHeader>
            <CardTitle>Default Leave Entitlements</CardTitle>
            <CardDescription>Default base leave days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="default_annual_leave">Annual Leave</Label>
                <Input type="number" id="default_annual_leave" name="default_annual_leave" value={settings.default_annual_leave} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_casual_leave">Casual Leave</Label>
                <Input type="number" id="default_casual_leave" name="default_casual_leave" value={settings.default_casual_leave} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_medical_leave">Medical Leave</Label>
                <Input type="number" id="default_medical_leave" name="default_medical_leave" value={settings.default_medical_leave} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="default_short_leave">Short Leave (Hours)</Label>
                <Input type="number" id="default_short_leave" name="default_short_leave" value={settings.default_short_leave} onChange={handleChange} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Leave Year Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Leave Year Configuration</CardTitle>
            <CardDescription>Financial year and carry forward rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leave_year_start_month">Start Month (1-12)</Label>
                <Input type="number" id="leave_year_start_month" name="leave_year_start_month" value={settings.leave_year_start_month} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leave_year_start_day">Start Day (1-31)</Label>
                <Input type="number" id="leave_year_start_day" name="leave_year_start_day" value={settings.leave_year_start_day} onChange={handleChange} />
              </div>
              <div className="flex flex-row items-center justify-between rounded-lg border p-4 col-span-2">
                <div className="space-y-0.5">
                  <Label className="text-base">Enable Carry Forward</Label>
                  <div className="text-sm text-muted-foreground">
                    Carry forward unused leaves to next year
                  </div>
                </div>
                <Switch
                  checked={settings.carry_forward_enabled}
                  onCheckedChange={handleSwitchChange}
                />
              </div>
              {settings.carry_forward_enabled && (
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="max_carry_forward_days">Max Carry Forward Days</Label>
                  <Input type="number" id="max_carry_forward_days" name="max_carry_forward_days" value={settings.max_carry_forward_days} onChange={handleChange} />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 7: Leave Entitlement Tiers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Leave Entitlement Tiers</CardTitle>
            <CardDescription>Customize leave entitlements based on years of service</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addLeaveTier}>
            <Plus className="h-4 w-4 mr-2" />
            Add Tier
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year From</TableHead>
                <TableHead>Year To</TableHead>
                <TableHead>Annual</TableHead>
                <TableHead>Casual</TableHead>
                <TableHead>Medical</TableHead>
                <TableHead>Short</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTiers.map((tier, idx) => (
                <TableRow key={idx}>
                  <TableCell><Input type="number" value={tier.year_from} onChange={(e) => updateLeaveTier(idx, 'year_from', Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" value={tier.year_to} onChange={(e) => updateLeaveTier(idx, 'year_to', Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" value={tier.annual} onChange={(e) => updateLeaveTier(idx, 'annual', Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" value={tier.casual} onChange={(e) => updateLeaveTier(idx, 'casual', Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" value={tier.medical} onChange={(e) => updateLeaveTier(idx, 'medical', Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" value={tier.short} onChange={(e) => updateLeaveTier(idx, 'short', Number(e.target.value))} /></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeLeaveTier(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {leaveTiers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No leave tiers configured.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section 8: Gratuity Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Gratuity Settings</CardTitle>
            <CardDescription>Rules for employee gratuity payments</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addGratuitySetting}>
            <Plus className="h-4 w-4 mr-2" />
            Add Gratuity Rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-1/3 space-y-2 mb-4">
            <Label htmlFor="gratuity_eligible_years">Eligible After (Years)</Label>
            <Input type="number" id="gratuity_eligible_years" name="gratuity_eligible_years" value={settings.gratuity_eligible_years} onChange={handleChange} />
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Year From</TableHead>
                <TableHead>Year To</TableHead>
                <TableHead>Amount Per Year (LKR)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gratuitySettings.map((setting, idx) => (
                <TableRow key={idx}>
                  <TableCell><Input type="number" value={setting.year_from} onChange={(e) => updateGratuitySetting(idx, 'year_from', Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" value={setting.year_to} onChange={(e) => updateGratuitySetting(idx, 'year_to', Number(e.target.value))} /></TableCell>
                  <TableCell><Input type="number" value={setting.amount_per_year} onChange={(e) => updateGratuitySetting(idx, 'amount_per_year', Number(e.target.value))} /></TableCell>
                  <TableCell>
                    <Select value={setting.type} onValueChange={(value) => updateGratuitySetting(idx, 'type', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fixed">Fixed Amount</SelectItem>
                        <SelectItem value="Half Month">Half Month Salary</SelectItem>
                        <SelectItem value="Full Month">Full Month Salary</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeGratuitySetting(idx)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </TableCell>
                </TableRow>
              ))}
              {gratuitySettings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No gratuity settings configured.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button size="lg" onClick={handleSaveSettings} disabled={loading}>
          <Save className="h-5 w-5 mr-2" />
          Save All Settings
        </Button>
      </div>
    </div>
  );
}
