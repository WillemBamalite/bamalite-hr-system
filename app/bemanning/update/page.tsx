"use client";

import { useState } from "react";
import { crewDatabase } from "@/data/crew-database";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function UpdatePage() {
  const [updateStatus, setUpdateStatus] = useState<string>("");

  const crewUpdates = {
    // MS Bellona - Allemaal 2/2 regime
    "frank-hennekam": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "yovanni-smith": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "dominik-medulan": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "jakub-misar": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "jack-suiker": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "rob-van-etten": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "alexander-gyori": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "lucien-de-grauw": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "david-gyori": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },

    // MS Bacchus - Allemaal 2/2 regime
    "koert-van-veen": { status: "thuis", thuisSinds: "2025-07-24", regime: "2/2" },
    "joao-fonseca": { status: "thuis", thuisSinds: "2025-07-24", regime: "2/2" },
    "roy-landsbergen": { status: "thuis", thuisSinds: "2025-07-24", regime: "2/2" },
    "ernst-van-de-vlucht": { status: "thuis", thuisSinds: "2025-07-24", regime: "2/2" },
    "alexander-specht": { status: "aan-boord", onBoardSince: "2025-07-24", regime: "2/2" },
    "peter-gunter": { status: "aan-boord", onBoardSince: "2025-07-24", regime: "2/2" },
    "mike-de-boer": { status: "aan-boord", onBoardSince: "2025-07-24", regime: "2/2" },
    "casper-de-ruiter": { status: "aan-boord", onBoardSince: "2025-07-24", regime: "2/2" },

    // MS Pluto - Allemaal 2/2 regime
    "jaroslav-polak": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "pavel-krejci": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "michal-dudka": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "jan-svoboda-jr": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "radim-stastka": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "jan-svoboda-sr": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },

    // MS Apollo - Gemengde regimes
    "ed-eichhorn": { status: "thuis", thuisSinds: "2025-07-23", regime: "1/1" },
    "thijs-creemers": { status: "thuis", thuisSinds: "2025-06-18", regime: "2/2" },
    "thomas-kucera": { status: "thuis", thuisSinds: "2025-06-18", regime: "2/2" },
    "martin-novak": { status: "thuis", thuisSinds: "2025-06-18", regime: "2/2" },
    "max-wansink": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "1/1" },
    "stanislaw-fus": { status: "aan-boord", onBoardSince: "2025-06-18", regime: "2/2" },
    "slawomir-diodasz": { status: "aan-boord", onBoardSince: "2025-06-18", regime: "2/2" },
    "mateusz-baryluk": { status: "aan-boord", onBoardSince: "2025-06-18", regime: "2/2" },

    // MS Jupiter
    "albert-bruinsma": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "dejan-popovic": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "milan-kabut": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "nikolai-djokic": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "helga-jordan": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "maurijn-klop": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "aliana-bruinsma": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "juraj-paal": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "jozef-tamas": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "martin-patzeld": { status: "nog-in-te-delen", regime: "2/2" },

    // MS Neptunus
    "erik-span": { status: "aan-boord", onBoardSince: "2025-07-17", regime: "2/2" },
    "milan-szabo": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "3/3" },
    "stefan-szabo": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "3/3" },
    "roman-kesiar": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "3/3" },
    "melvin-van-der-werf": { status: "thuis", thuisSinds: "2025-07-17", regime: "2/2" },
    "jurena-dalibor": { status: "thuis", thuisSinds: "2025-07-17", regime: "3/3" },
    "michael-bobaly": { status: "thuis", thuisSinds: "2025-07-17", regime: "3/3" },
    "istvan-vockei": { status: "thuis", thuisSinds: "2025-07-17", regime: "3/3" },

    // MS Realite - Altijd aan boord
    "bart-bruinsma": { status: "aan-boord", onBoardSince: "2025-01-01", regime: "2/2" },
    "jos-meijer": { status: "aan-boord", onBoardSince: "2025-01-01", regime: "2/2" },
    "willem-van-der-bent": { status: "aan-boord", onBoardSince: "2025-01-01", regime: "2/2" },
    "leo-godde": { status: "aan-boord", onBoardSince: "2025-01-01", regime: "2/2" },

    // MS Harmonie - Allemaal 2/2 regime
    "radek-polak": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "miroslav-polak": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "lukas-primus": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "christiaan-majsak": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "robert-pilar": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "tomas-trunecek": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "david-zbynek": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "pavel-hypsa": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },

    // MS Linde - Allemaal 2/2 regime
    "theodorus-van-hasselt": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "micky-stenczel": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "michal-ptacek": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "gina-bodrij": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "marcel-hoogakker": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "zsolt-radvansky": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "stefan-herdics": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "jan-wonar": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "rudolf-guban": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },

    // MS Primera - Allemaal 2/2 regime
    "anthonie-quist": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "ladislav-nemcek": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "marian-sramek": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "peter-jakus": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "peer-roosen": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "pavol-pastorek": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "v-danasz": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "jozef-nemcek": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "peter-mazereeuw": { status: "nog-in-te-delen", regime: "2/2" },

    // MS Caritas - Allemaal 2/2 regime
    "pierre-spronk": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "gene-waan": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "daniel-van-den-ende": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "ravi-van-logchem": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "arie-de-leeuw": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "michael-fateef": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "laurent-eberling": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "david-robert-tjalling": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },

    // MS Maike - Allemaal 2/2 regime
    "harry-braam": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "silvester-pols": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "danny-jacobse": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "glenn-claessens": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "2/2" },
    "floris-suiker": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "roy-blijenberg": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "abdul-akra": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "devano-hultma": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },
    "dirk-de-bruine": { status: "thuis", thuisSinds: "2025-07-16", regime: "2/2" },

    // MS Libertas - Allemaal 2/2 regime
    "huib-ten-hacken": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "tibor-makula": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "bedenek-zedenek": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "amin-hammouch": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "richard-zegers": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "ferry-groeneweg": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "arvid-van-zon": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "pavel-stary": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },

    // MS Egalite - Allemaal 2/2 regime
    "peter-bolle": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "joey-ramos": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "leroy-hoogakker": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "abul": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "xenja-didden": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "marek-uhrecky": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "henri-bruinsma": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "roy-tealman": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "obby-bernanbla": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },

    // MS Fidelitas - Allemaal 2/2 regime
    "hendrik-korsten": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "jessica-korsten": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "robin-vanicek": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "patrick-svoboda": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "harald-jorgensen": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "ladislav-mesarcik": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "jan-tokar": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "djovanni-de-graaf": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },

    // MS Serenitas
    "job-handgraaf": { status: "aan-boord", onBoardSince: "2025-07-23", regime: "2/2" },
    "daniel-rakosie": { status: "thuis", thuisSinds: "2025-07-16", regime: "3/3" },
    "david-paraska": { status: "thuis", thuisSinds: "2025-07-16", regime: "3/3" },
    "vaclav-m-lady": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "3/3" },
    "jakob-leunis": { status: "thuis", thuisSinds: "2025-07-23", regime: "2/2" },
    "milos-jurica": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "3/3" },
    "kirill-sevatstianov": { status: "nog-in-te-delen", regime: "3/3" },
    "ladislav-mesarcik-ser": { status: "aan-boord", onBoardSince: "2025-07-16", regime: "3/3" },
  };

  const handleUpdate = () => {
    try {
      // Update localStorage met nieuwe data
      const currentData = JSON.parse(localStorage.getItem('crewDatabase') || '{}');
      
      Object.keys(crewUpdates).forEach(crewId => {
        if (currentData[crewId]) {
          currentData[crewId] = {
            ...currentData[crewId],
            ...crewUpdates[crewId as keyof typeof crewUpdates]
          };
        }
      });

      localStorage.setItem('crewDatabase', JSON.stringify(currentData));
      setUpdateStatus("✅ Alle bemanningsleden succesvol geüpdatet!");
      
      // Reload de pagina om de wijzigingen te tonen
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      setUpdateStatus("❌ Fout bij updaten: " + error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Bemanningslijst Update</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Deze pagina update alle bemanningsleden volgens de officiële lijst met correcte datums, regimes en statussen.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.keys(crewUpdates).map((crewId) => {
                const crew = crewDatabase[crewId as keyof typeof crewDatabase];
                const update = crewUpdates[crewId as keyof typeof crewUpdates];
                
                if (!crew) return null;
                
                return (
                  <div key={crewId} className="border rounded-lg p-3">
                    <div className="font-medium">{crew.firstName} {crew.lastName}</div>
                    <div className="text-sm text-gray-600">{crew.position}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant={update.status === "aan-boord" ? "default" : "secondary"}>
                        {update.status}
                      </Badge>
                      <Badge variant="outline">{update.regime}</Badge>
                    </div>
                    {update.onBoardSince && (
                      <div className="text-xs text-gray-500 mt-1">
                        Aan boord sinds: {update.onBoardSince}
                      </div>
                    )}
                    {update.thuisSinds && (
                      <div className="text-xs text-gray-500 mt-1">
                        Thuis sinds: {update.thuisSinds}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <Button onClick={handleUpdate} className="w-full">
              Update Alle Bemanningsleden
            </Button>
            
            {updateStatus && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                {updateStatus}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 