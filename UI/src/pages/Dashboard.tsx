import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRDisplay } from "@/components/QRDisplay";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Bell, Phone, Video, MessageSquare, LogOut, Plus } from "lucide-react";

const Dashboard = () => {
  // Mock data - será substituído por dados reais
  const stats = {
    total: 45,
    answered: 32,
    missed: 13,
    pending: 2,
  };

  const recentCalls = [
    { id: "1", visitor: "Visitante 1", time: "10:30", status: "answered" as const },
    { id: "2", visitor: "Visitante 2", time: "09:15", status: "missed" as const },
    { id: "3", visitor: "Visitante 3", time: "08:45", status: "answered" as const },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-primary/5">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Smart Bell</h1>
                <p className="text-sm text-muted-foreground">Painel de Controle</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total de Chamadas
                </CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Atendidas
                </CardTitle>
                <Phone className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">{stats.answered}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Perdidas
                </CardTitle>
                <Video className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">{stats.missed}</div>
              </CardContent>
            </Card>

            <Card className="shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pendentes
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">{stats.pending}</div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* QR Code Section */}
            <div className="lg:col-span-1 space-y-4">
              <QRDisplay houseId="demo-house" houseName="Minha Casa" />
              
              <Button className="w-full gap-2 bg-gradient-primary">
                <Plus className="h-4 w-4" />
                Nova Residência
              </Button>
            </div>

            {/* Recent Calls */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg">
                <CardHeader className="bg-gradient-card">
                  <CardTitle>Chamadas Recentes</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {recentCalls.map((call) => (
                      <div
                        key={call.id}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bell className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{call.visitor}</p>
                            <p className="text-sm text-muted-foreground">{call.time}</p>
                          </div>
                        </div>
                        <StatusBadge status={call.status} />
                      </div>
                    ))}
                  </div>

                  {recentCalls.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>Nenhuma chamada ainda</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
