import { featureGroups } from "@/data/catalogue";
export default function PlanComparison() {
  return (
    <section id="compare" className="plan-comparison">
      <span className="eyebrow">THE FULL PICTURE</span>
      <h2>Compare what each plan is designed to do.</h2>
      <p>
        Paid plans are not on sale yet. “Planned” features are roadmap items,
        not available purchases. Hardware support and installation are separate
        from a subscription.
      </p>
      <div className="resource-actions">
        {["Basic", "Basic Pro", "Pro"].map((p) => (
          <a
            className="btn btn-secondary"
            href={`/plans/${p.toLowerCase().replace(" ", "-")}`}
            key={p}
          >
            {p} in detail
          </a>
        ))}
      </div>
      {featureGroups.map((g) => (
        <div key={g.name}>
          <h3>{g.name}</h3>
          <div
            className="data-table-wrap"
            tabIndex={0}
            role="region"
            aria-label={`${g.name} plan comparison`}
          >
            <table>
              <thead>
                <tr>
                  {[
                    "Feature",
                    "Free",
                    "Basic",
                    "Basic Pro",
                    "Pro",
                    "What to know",
                  ].map((h) => (
                    <th key={h} scope="col">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell, i) =>
                      i === 0 ? (
                        <th scope="row" key={i}>
                          {cell}
                        </th>
                      ) : (
                        <td key={i}>{cell}</td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
