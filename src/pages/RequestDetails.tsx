import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { requestApi } from '@/services/api';
import { toast } from '@/hooks/use-toast';

interface RequestDetails {
  id: string;
  user_id: string;
  request_type: string;
  status: string;
  details: any;
  rationale: string;
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  admin_user_id?: string;
  rejection_reason?: string;
}

const RequestDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RequestDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const response = await requestApi.getRequestById(id);
        setRequest(response as RequestDetails);
      } catch (error) {
        console.error('Error fetching request details:', error);
        toast({
          title: "Error",
          description: "Failed to load request details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [id]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'APPROVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === 'APPROVED' ? 'default' : 
                   status === 'REJECTED' ? 'destructive' : 'secondary';
    return <Badge variant={variant}>{status}</Badge>;
  };

  const renderRequestDetails = () => {
    if (!request) return null;

    if (request.request_type === 'TOPIC') {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Topic Name</label>
            <p className="mt-1 text-sm text-gray-900">{request.details?.topic_name || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Partition Count</label>
              <p className="mt-1 text-sm text-gray-900">{request.details?.partition_count || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Replication Factor</label>
              <p className="mt-1 text-sm text-gray-900">{request.details?.replication_factor || 'N/A'}</p>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <p className="mt-1 text-sm text-gray-900">{request.details?.description || 'N/A'}</p>
          </div>
        </div>
      );
    } else if (request.request_type === 'ACL') {
      return (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Resource Name</label>
            <p className="mt-1 text-sm text-gray-900">{request.details?.resource_name || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Resource Type</label>
              <p className="mt-1 text-sm text-gray-900">{request.details?.resource_type || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Permission Type</label>
              <p className="mt-1 text-sm text-gray-900">{request.details?.permission_type || 'N/A'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Operation</label>
              <p className="mt-1 text-sm text-gray-900">{request.details?.operation || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Principal</label>
              <p className="mt-1 text-sm text-gray-900">{request.details?.principal || 'N/A'}</p>
            </div>
          </div>
        </div>
      );
    }

    return <p className="text-sm text-gray-500">No details available</p>;
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading request details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900">Request not found</p>
            <Button 
              onClick={() => navigate('/requests')} 
              className="mt-4"
              variant="outline"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requests
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-6">
            <Button 
              onClick={() => navigate('/requests')} 
              variant="outline" 
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requests
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Request Details</h1>
            <p className="mt-2 text-gray-600">View detailed information about this request</p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      {request.request_type} Request #{request.id}
                    </CardTitle>
                    <CardDescription>
                      Submitted on {new Date(request.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Request Information</h3>
                    {renderRequestDetails()}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Business Rationale</label>
                    <p className="mt-1 text-sm text-gray-900">{request.rationale || 'N/A'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Created At</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Created At</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                    {request.approved_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Approved At</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(request.approved_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                    {request.rejected_at && (
                      <div>
                        <label className="text-sm font-medium text-gray-700">Rejected At</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {new Date(request.rejected_at).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetails;