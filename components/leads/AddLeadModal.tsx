"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, ChevronsUpDown, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

import type { Lead } from "@/types/lead"
import { useAuth } from "@/hooks/useAuth"
import { PermissionService } from "@/lib/permissions"
import { budgetRanges, locations } from "@/lib/mockData"
import type { NewLeadData } from "@/hooks/useLeads"
import { parseDDMMYYYY, formatToDDMMYYYY } from "@/lib/dateUtils"

interface AddLeadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddLead: (lead: NewLeadData) => Promise<Lead>
  existingLeads: Lead[]
}

// Define a specific type for the form state that replaces Date with string
type LeadFormState = Omit<NewLeadData, "receivedDate"> & { 
  receivedDate: string 
}

export function AddLeadModal({ open, onOpenChange, onAddLead, existingLeads }: AddLeadModalProps) {
  const { user } = useAuth()
  const permissionService = PermissionService.getInstance()
  
  const [agents, setAgents] = useState<any[]>([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [locationSelectOpen, setLocationSelectOpen] = useState(false)
  const [locationSearchValue, setLocationSearchValue] = useState("")

  const initialFormData: LeadFormState = {
    name: "",
    primaryPhone: "",
    secondaryPhone: "",
    primaryEmail: "",
    secondaryEmail: "",
    propertyType: "Residential",
    budgetRange: "",
    preferredLocations: [],
    source: "Website",
    status: "New",
    assignedAgent: "",
    notes: "",
    leadScore: "Medium",
    leadType: "Lead",
    receivedDate: formatToDDMMYYYY(new Date()),
  }

  const [formData, setFormData] = useState<LeadFormState>(initialFormData)

  useEffect(() => {
    if (open) {
      fetchAgents()
      const canAssign = permissionService.canAssignLeads(user)
      
      setFormData({
        ...initialFormData,
        receivedDate: formatToDDMMYYYY(new Date()),
        createdBy: user?.id || "system",
        assignedAgent: user?.role === "agent" && !canAssign ? user.id : "",
      })
      setModalError(null)
      setLocationSelectOpen(false)
      setLocationSearchValue("")
    }
  }, [open, user])

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true)
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
      const response = await fetch("/api/users", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      })

      if (response.ok) {
        const users = await response.json()
        const agentUsers = users.filter((u: any) => u.role === "agent" && u.isActive)
        setAgents(agentUsers)
      } else {
        setAgents([])
      }
    } catch (error) {
      setAgents([])
    } finally {
      setLoadingAgents(false)
    }
  }

  const availableAgents = permissionService.filterAgentsForUser(agents, user)
  const canAssignLeads = permissionService.canAssignLeads(user)

  const formatPhoneNumber = (value: string) => {
    const digits = value.replace(/\D/g, "")
    if (digits.startsWith("91")) return `+${digits}`
    if (digits.length === 10) return `+91${digits}`
    if (digits.length > 0 && digits.length < 10) return `+91${digits}`
    return digits.length > 0 ? `+${digits}` : ""
  }

  const handlePhoneChange = (field: "primaryPhone" | "secondaryPhone", value: string) => {
    setModalError(null)
    setFormData((prev) => ({ ...prev, [field]: formatPhoneNumber(value) }))
  }

  const handlePreferredLocationSelect = (selectedLocation: string) => {
    setFormData((prev) => {
      const currentLocations = prev.preferredLocations || []
      const isSelected = currentLocations.includes(selectedLocation)
      return {
        ...prev,
        preferredLocations: isSelected
          ? currentLocations.filter((loc) => loc !== selectedLocation)
          : [...currentLocations, selectedLocation],
      }
    })
    setLocationSearchValue("")
  }

  const removeLocationBadge = (locationToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      preferredLocations: prev.preferredLocations.filter((loc) => loc !== locationToRemove),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)

    if (!formData.name || !formData.primaryPhone || !formData.primaryEmail) {
      const msg = "Please fill in all required fields."
      setModalError(msg)
      toast.error(msg)
      return
    }

    const existingLeadWithPhone = existingLeads.find((lead) => lead.primaryPhone === formData.primaryPhone)
    if (existingLeadWithPhone) {
      const msg = `Phone number "${formData.primaryPhone}" is already registered.`
      setModalError(msg)
      toast.error(msg)
      return
    }

    setIsSubmitting(true)
    try {
      // Map form string values back to the expected NewLeadData structure (Date objects)
      const leadToSubmit: NewLeadData = {
        ...formData,
        assignedAgent: (user?.role === "agent" && !canAssignLeads) ? (user.id || "") : formData.assignedAgent,
        receivedDate: parseDDMMYYYY(formData.receivedDate) || new Date(),
        createdBy: user?.id || "system",
      }

      await onAddLead(leadToSubmit)
      onOpenChange(false)
    } catch (error) {
      const msg = `Failed to add lead: ${(error as Error).message}`
      setModalError(msg)
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Create a new lead record with all the essential information.</DialogDescription>
        </DialogHeader>

        {modalError && (
          <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md mb-4">
            <p className="font-semibold">Error:</p>
            <p>{modalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="primaryPhone">Primary Phone *</Label>
                <Input
                  id="primaryPhone"
                  value={formData.primaryPhone}
                  onChange={(e) => handlePhoneChange("primaryPhone", e.target.value)}
                  placeholder="+91XXXXXXXXXX"
                  required
                />
              </div>

              <div>
                <Label htmlFor="primaryEmail">Primary Email *</Label>
                <Input
                  id="primaryEmail"
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, primaryEmail: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="receivedDate">Received Date * (DD-MM-YYYY)</Label>
                <Input
                  id="receivedDate"
                  placeholder="DD-MM-YYYY"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, receivedDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="propertyType">Property Type</Label>
                <Select
                  value={formData.propertyType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, propertyType: value as Lead["propertyType"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Land">Land</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="budgetRange">Budget Range (INR)</Label>
                <Select
                  value={formData.budgetRange || "none"}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, budgetRange: value === "none" ? "" : value }))}
                >
                  <SelectTrigger><SelectValue placeholder="Select budget range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select budget range</SelectItem>
                    {budgetRanges.map((range) => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {canAssignLeads && (
                <div>
                  <Label htmlFor="assignedAgent">Assigned Agent</Label>
                  <Select
                    value={formData.assignedAgent || "unassigned"}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, assignedAgent: value === "unassigned" ? "" : value }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {loadingAgents ? (
                        <SelectItem value="loading" disabled>Loading agents...</SelectItem>
                      ) : (
                        availableAgents.map((agent) => (
                          <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div>
                <Label htmlFor="leadType">Lead Type *</Label>
                <Select
                  value={formData.leadType}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, leadType: value as Lead["leadType"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead">Lead</SelectItem>
                    <SelectItem value="Cold-Lead">Cold Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Preferred Locations</Label>
            <Popover open={locationSelectOpen} onOpenChange={setLocationSelectOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between mt-2 h-auto min-h-10 px-3 py-2">
                  <div className="flex flex-wrap gap-1 items-center">
                    {formData.preferredLocations.length > 0 ? (
                      formData.preferredLocations.map((loc) => (
                        <Badge key={loc} className="flex items-center gap-1">
                          {loc}
                          <XCircle className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); removeLocationBadge(loc); }} />
                        </Badge>
                      ))
                    ) : <span className="text-gray-500">Select locations...</span>}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search..." value={locationSearchValue} onValueChange={setLocationSearchValue} />
                  <CommandList>
                    <CommandEmpty>No results.</CommandEmpty>
                    <CommandGroup>
                      {locations.filter(l => l.toLowerCase().includes(locationSearchValue.toLowerCase())).map((loc) => (
                        <CommandItem key={loc} onSelect={() => handlePreferredLocationSelect(loc)}>
                          <Check className={cn("mr-2 h-4 w-4", formData.preferredLocations.includes(loc) ? "opacity-100" : "opacity-0")} />
                          {loc}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}