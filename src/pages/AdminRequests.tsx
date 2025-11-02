import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, Eye, AlertCircle } from 'lucide-react';
import { requestApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface Request {
  id: string;
  user_id: string;
  request_type: 'TOPIC' | 'ACL';
  details: any;
  rationale: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  admin_user_id?: string;
  rejection_reason?: string;
}

const AdminRequests = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await requestApi.getAllRequests();
      setRequests(response as Request[]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string) => {
    try {
      setActionLoading(true);
      await requestApi.approveRequest(requestId);
      toast({
        title: "Success",
        description: "Request approved successfully",
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (requestId: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Rejection reason is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setActionLoading(true);
      await requestApi.rejectRequest(requestId, rejectionReason);
      toast({
        title: "Success",
        description: "Request rejected successfully",
      });
      setRejectionReason('');
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'APPROVED':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'REJECTED':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">Admin - All Requests</h1>
              <p className="text-muted-foreground">Manage and review all user requests</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Request Management
                </CardTitle>
                <CardDescription>
                  Review, approve, or reject user requests for topics and ACLs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading requests...</div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No requests found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>User ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <Badge variant="secondary">{request.request_type}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{request.user_id}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>{formatDate(request.created_at)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm" onClick={() => setSelectedRequest(request)}>
                                    <Eye className="w-4 h-4 mr-1" />
                                    View
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Request Details</DialogTitle>
                                    <DialogDescription>
                                      {request.request_type} request from user {request.user_id}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Rationale</h4>
                                      <p className="text-sm text-muted-foreground">{request.rationale}</p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Details</h4>
                                      <pre className="text-sm bg-muted p-3 rounded overflow-auto">
                                        {JSON.stringify(request.details, null, 2)}
                                      </pre>
                                    </div>
                                    {request.rejection_reason && (
                                      <div>
                                        <h4 className="font-semibold mb-2">Rejection Reason</h4>
                                        <p className="text-sm text-muted-foreground">{request.rejection_reason}</p>
                                      </div>
                                    )}
                                  </div>
                                  {request.status === 'PENDING' && (
                                    <DialogFooter className="gap-2">
                                      <Button
                                        onClick={() => handleApprove(request.id)}
                                        disabled={actionLoading}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Approve
                                      </Button>
                                      <Dialog>
                                        <DialogTrigger asChild>
                                          <Button variant="destructive">
                                            <XCircle className="w-4 h-4 mr-1" />
                                            Reject
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Reject Request</DialogTitle>
                                            <DialogDescription>
                                              Please provide a reason for rejecting this request.
                                            </DialogDescription>
                                          </DialogHeader>
                                          <Textarea
                                            placeholder="Enter rejection reason..."
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                          />
                                          <DialogFooter>
                                            <Button
                                              variant="destructive"
                                              onClick={() => handleReject(request.id)}
                                              disabled={actionLoading || !rejectionReason.trim()}
                                            >
                                              Reject Request
                                            </Button>
                                          </DialogFooter>
                                        </DialogContent>
                                      </Dialog>
                                    </DialogFooter>
                                  )}
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminRequests;