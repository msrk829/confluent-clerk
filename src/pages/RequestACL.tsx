import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { requestApi } from '@/services/api';

const RequestACL = () => {
  const [formData, setFormData] = useState({
    principal: '',
    operation: '',
    resource_type: '',
    resource_name: '',
    host_pattern: '*',
    rationale: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.rationale.length < 10) {
      toast({
        title: 'Validation Error',
        description: 'Business rationale must be at least 10 characters long',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const requestData = {
        request_type: 'ACL' as const,
        details: {
          principal: formData.principal,
          operation: formData.operation,
          resource_type: formData.resource_type,
          resource_name: formData.resource_name,
          host_pattern: formData.host_pattern,
        },
        rationale: formData.rationale,
      };

      await requestApi.createACLRequest(requestData);
      
      toast({
        title: 'ACL request submitted successfully',
        description: 'Your ACL permission request has been submitted for approval',
      });
      
      // Reset form
      setFormData({
        principal: '',
        operation: '',
        resource_type: '',
        resource_name: '',
        host_pattern: '*',
        rationale: ''
      });
    } catch (error) {
      toast({
        title: 'Submission failed',
        description: error instanceof Error ? error.message : 'Failed to submit request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-3xl">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">Request ACL Permission</h1>
            <p className="text-muted-foreground">
              Request access control permissions for Kafka resources
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>ACL Configuration</CardTitle>
              <CardDescription>
                Specify the permissions you need
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="principal">Principal *</Label>
                  <Input
                    id="principal"
                    value={formData.principal}
                    onChange={(e) => setFormData({...formData, principal: e.target.value})}
                    placeholder="User:alice or User:CN=alice,OU=users,DC=example,DC=com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The user or service that will have the permission
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="resource_type">Resource Type *</Label>
                    <Select 
                      value={formData.resource_type}
                      onValueChange={(value) => setFormData({...formData, resource_type: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select resource type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TOPIC">Topic</SelectItem>
                        <SelectItem value="GROUP">Consumer Group</SelectItem>
                        <SelectItem value="CLUSTER">Cluster</SelectItem>
                        <SelectItem value="TRANSACTIONAL_ID">Transactional ID</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="operation">Operation *</Label>
                    <Select 
                      value={formData.operation}
                      onValueChange={(value) => setFormData({...formData, operation: value})}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="READ">Read</SelectItem>
                        <SelectItem value="WRITE">Write</SelectItem>
                        <SelectItem value="CREATE">Create</SelectItem>
                        <SelectItem value="DELETE">Delete</SelectItem>
                        <SelectItem value="ALTER">Alter</SelectItem>
                        <SelectItem value="DESCRIBE">Describe</SelectItem>
                        <SelectItem value="ALL">All</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resource_name">Resource Name *</Label>
                  <Input
                    id="resource_name"
                    value={formData.resource_name}
                    onChange={(e) => setFormData({...formData, resource_name: e.target.value})}
                    placeholder="my-topic-name or * for all"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The specific topic, group, or use * for wildcard
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="host_pattern">Host Pattern</Label>
                  <Input
                    id="host_pattern"
                    value={formData.host_pattern}
                    onChange={(e) => setFormData({...formData, host_pattern: e.target.value})}
                    placeholder="*"
                  />
                  <p className="text-xs text-muted-foreground">
                    IP address or * for all hosts (default: *)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rationale">Business Rationale *</Label>
                  <Textarea
                    id="rationale"
                    value={formData.rationale}
                    onChange={(e) => setFormData({...formData, rationale: e.target.value})}
                    placeholder="Explain why you need this permission"
                    rows={4}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 10 characters
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                  <Button type="button" variant="outline" className="flex-1" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RequestACL;
