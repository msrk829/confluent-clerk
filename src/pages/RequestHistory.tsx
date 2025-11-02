import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { requestApi } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface Request {
  id: string;
  request_type: string;
  status: string;
  details: any;
  rationale: string;
  created_at: string;
}

const RequestHistory = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<Request[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await requestApi.getUserRequests();
        setRequests(data as Request[]);
      } catch (error) {
        toast({
          title: 'Failed to load requests',
          description: error instanceof Error ? error.message : 'Failed to fetch request history',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'APPROVED':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "default",
      APPROVED: "secondary",
      REJECTED: "destructive",
      CANCELLED: "outline"
    };
    
    return (
      <Badge variant={variants[status] || "default"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Request History</h1>
            <p className="text-muted-foreground">
              View all your submitted requests and their status
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Requests</CardTitle>
              <CardDescription>
                Your complete request history
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                  <p className="text-sm text-muted-foreground">Loading requests...</p>
                </div>
              ) : requests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No requests yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    You haven't submitted any requests. Start by requesting a new topic or ACL permission.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Resource</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => {
                      const resourceName = request.request_type === 'TOPIC' 
                        ? request.details?.topic_name 
                        : request.details?.resource_name || 'N/A';
                      
                      return (
                        <TableRow key={request.id}>
                          <TableCell className="flex items-center gap-2">
                            {getStatusIcon(request.status)}
                            {request.request_type}
                          </TableCell>
                          <TableCell className="font-medium">{resourceName}</TableCell>
                          <TableCell>{getStatusBadge(request.status)}</TableCell>
                          <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <button 
                              className="text-primary hover:underline text-sm"
                              onClick={() => navigate(`/requests/${request.id}`)}
                            >
                              View Details
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RequestHistory;
