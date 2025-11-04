import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileSearch, RefreshCw, Filter, Calendar, User, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auditApi } from '@/services/api';

interface AuditLog {
  id: string;
  timestamp: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  changes?: Record<string, any>;
  ip_address?: string;
}

const AdminAudit = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntityType, setFilterEntityType] = useState('');
  const [limit, setLimit] = useState<number>(100);
  const [offset, setOffset] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {};
      if (limit) params.limit = limit;
      if (offset) params.offset = offset;
      if (filterAction) params.action = filterAction;
      if (filterEntityType) params.entity_type = filterEntityType;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      const logs = await auditApi.getLogs(params as any) as AuditLog[];
      setAuditLogs(logs || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchAuditLogs();
  };

  const getStatusBadge = (action: string) => {
    if (action.includes('APPROVE') || action.includes('CREATE')) {
      return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Success</Badge>;
    }
    if (action.includes('REJECT') || action.includes('FAILED')) {
      return <Badge variant="destructive">Failure</Badge>;
    }
    return <Badge variant="outline">Info</Badge>;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('LOGIN')) return <User className="w-4 h-4" />;
    if (action.includes('REQUEST')) return <FileSearch className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = auditLogs.filter(log => {
    const detailsStr = JSON.stringify(log.changes || {});
    const matchesSearch = searchTerm === '' || 
      (log.user_id ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      detailsStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = !filterAction || log.action === filterAction;
    const matchesEntity = !filterEntityType || log.entity_type === filterEntityType;
    return matchesSearch && matchesAction && matchesEntity;
  });

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Audit Logs</h1>
                <p className="text-muted-foreground">Monitor system activities and user actions</p>
              </div>
              <Button onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </CardTitle>
                <CardDescription>
                  Filter audit logs by search term, action, entity, date range
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Search</label>
                    <Input
                      placeholder="Search by user, action, or details..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Action</label>
                    <Select value={filterAction} onValueChange={(v) => setFilterAction(v === 'ALL' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All actions" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Actions</SelectItem>
                        <SelectItem value="LOGIN">Login</SelectItem>
                        <SelectItem value="USER_CREATED">User Created</SelectItem>
                        <SelectItem value="USER_ROLE_UPDATED">User Role Updated</SelectItem>
                        <SelectItem value="TOPIC_REQUEST_CREATED">Topic Request Created</SelectItem>
                        <SelectItem value="ACL_REQUEST_CREATED">ACL Request Created</SelectItem>
                        <SelectItem value="REQUEST_APPROVED">Request Approved</SelectItem>
                        <SelectItem value="REQUEST_REJECTED">Request Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Entity Type</label>
                    <Select value={filterEntityType} onValueChange={(v) => setFilterEntityType(v === 'ALL' ? '' : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All entities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Entities</SelectItem>
                        <SelectItem value="USER">User</SelectItem>
                        <SelectItem value="REQUEST">Request</SelectItem>
                        <SelectItem value="KAFKA_TOPICS">Kafka Topics</SelectItem>
                        <SelectItem value="ACL">ACL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Start Date</label>
                    <Input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">End Date</label>
                    <Input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Limit</label>
                      <Input type="number" min={1} max={1000} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Offset</label>
                      <Input type="number" min={0} value={offset} onChange={(e) => setOffset(Number(e.target.value))} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSearch className="w-5 h-5" />
                  Audit Trail
                </CardTitle>
                <CardDescription>
                  Showing {filteredLogs.length} of {auditLogs.length} audit log entries
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading audit logs...</div>
                ) : filteredLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {auditLogs.length === 0 ? 'No audit logs found' : 'No logs match the current filters'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="font-mono text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {formatDate(log.timestamp)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.user_id}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getActionIcon(log.action)}
                              <Badge variant="secondary">{log.action}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{log.entity_type}</div>
                              {log.entity_id && (
                                <div className="text-sm text-muted-foreground font-mono">{log.entity_id}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(log.action)}</TableCell>
                          <TableCell className="font-mono text-sm">{log.ip_address || '—'}</TableCell>
                          <TableCell className="max-w-xs truncate" title={JSON.stringify(log.changes || {})}>
                            {JSON.stringify(log.changes || {})}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <div className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Audit Service Status</CardTitle>
                  <CardDescription>
                    Current status of audit logging service
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Activity className="w-4 h-4" />
                    <span>Audit service integration is in development</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Real-time audit logging will be available once the audit service is fully integrated.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminAudit;