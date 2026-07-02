import { ReactNode } from "react";
import { Agreement } from "@/lib/types";
import { formatDate } from "@/lib/utils/format";
import { calculateRentalSubtotal, formatRentalPeriod } from "@/lib/agreement/equipmentRental";
import {
  calculateLocationAgreementTotal,
  calculateLocationFeeTotal,
  calculatePropsSubtotal,
  formatLocationKindLabel,
} from "@/lib/agreement/locationAgreement";
import { formatFeeLabel, formatPayeeTaxBlock } from "@/lib/agreement/payeeEngagement";
import { AgreementDocumentMeta } from "@/lib/agreement/documentMeta";
import {
  effectivePaymentTerms,
  formatPromotionLabel,
  hasPaymentPromotion,
} from "@/lib/agreement/paymentDiscount";

function formatCurrency(amount?: number) {
  if (amount === undefined || amount === null) return "—";
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-900">{title}</h2>
      <div className="space-y-1 text-sm text-slate-700">{children}</div>
    </section>
  );
}

function DetailLine({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <p>
      <span className="font-semibold">{label}:</span> {value}
    </p>
  );
}

export function AgreementSigningDocumentBody({
  agreement,
  meta,
}: {
  agreement: Agreement;
  meta: AgreementDocumentMeta;
}) {
  const pd = agreement.projectDetails;

  return (
    <>
      <section className="mb-6 space-y-1 text-sm text-slate-700">
        <p>
          <span className="font-semibold">Title:</span> {agreement.title}
        </p>
        <p>
          <span className="font-semibold">Project:</span> {pd.projectName}
        </p>
        {pd.clientName && (
          <p>
            <span className="font-semibold">Client:</span> {pd.clientName}
          </p>
        )}
        <p>
          <span className="font-semibold">Date:</span> {formatDate(new Date().toISOString())}
        </p>
        {(pd.projectType || pd.shootType) && (
          <p>
            <span className="font-semibold">Type:</span> {pd.projectType} · {pd.shootType}
          </p>
        )}
        {pd.shootDate && (
          <p>
            <span className="font-semibold">Shoot date:</span> {formatDate(pd.shootDate)}
          </p>
        )}
        {pd.location && (
          <p>
            <span className="font-semibold">Location:</span> {pd.location}
          </p>
        )}
      </section>

      {pd.projectOverview && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-900">Project Overview</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {pd.projectOverview}
          </p>
        </section>
      )}

      {meta.isInternal && pd.clientOwner && (
        <DetailSection title="Client Ownership">
          <DetailLine label="Client relationship owned by" value={pd.clientOwner} />
          <DetailLine label="Lead producer" value={pd.leadProducer} />
        </DetailSection>
      )}

      {meta.isRental && agreement.equipmentRentalDetails && (
        <>
          <DetailSection title="Rental Period">
            <DetailLine label="Period" value={formatRentalPeriod(agreement.equipmentRentalDetails)} />
            <DetailLine label="Pickup" value={agreement.equipmentRentalDetails.pickupLocation} />
            <DetailLine label="Return" value={agreement.equipmentRentalDetails.returnLocation} />
          </DetailSection>
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-900">
              Equipment Schedule
            </h2>
            {agreement.equipmentRentalDetails.lineItems.length === 0 ? (
              <p className="text-sm text-slate-700">No equipment items listed.</p>
            ) : (
              <ul className="space-y-2 text-sm text-slate-700">
                {agreement.equipmentRentalDetails.lineItems.map((item) => (
                  <li key={item.id}>
                    {item.quantity}x {item.name} — {formatCurrency(item.dailyRate)}/day × {item.days}{" "}
                    day(s) = {formatCurrency(item.lineTotal)}
                    {item.serialNumber && (
                      <span className="block text-xs text-slate-500">Serial: {item.serialNumber}</span>
                    )}
                    {item.replacementValue != null && (
                      <span className="block text-xs text-slate-500">
                        Replacement value: {formatCurrency(item.replacementValue)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-sm font-semibold text-slate-800">
              Subtotal: {formatCurrency(calculateRentalSubtotal(agreement.equipmentRentalDetails.lineItems))}
            </p>
          </section>
          <DetailSection title="Rental Terms">
            {agreement.equipmentRentalDetails.depositAmount != null && (
              <p>Deposit: {formatCurrency(agreement.equipmentRentalDetails.depositAmount)}</p>
            )}
            {agreement.equipmentRentalDetails.lateFeePerDay != null && (
              <p>Late fee: {formatCurrency(agreement.equipmentRentalDetails.lateFeePerDay)}/day</p>
            )}
            <p>Insurance required: {agreement.equipmentRentalDetails.insuranceRequired ? "Yes" : "No"}</p>
            {agreement.equipmentRentalDetails.renterInsuranceNotes && (
              <p>{agreement.equipmentRentalDetails.renterInsuranceNotes}</p>
            )}
            {agreement.equipmentRentalDetails.responsibilityNotes && (
              <p>{agreement.equipmentRentalDetails.responsibilityNotes}</p>
            )}
          </DetailSection>
        </>
      )}

      {meta.isTalent && agreement.talentAgreementDetails && (
        <DetailSection title="Talent Engagement">
          <DetailLine label="Role" value={agreement.talentAgreementDetails.talentRole} />
          {(agreement.talentAgreementDetails.engagementStartDate ||
            agreement.talentAgreementDetails.engagementEndDate) && (
            <p>
              Engagement: {agreement.talentAgreementDetails.engagementStartDate || "—"} through{" "}
              {agreement.talentAgreementDetails.engagementEndDate || "—"}
            </p>
          )}
          <DetailLine label="Shoot dates" value={agreement.talentAgreementDetails.shootDates} />
          <DetailLine label="Location" value={agreement.talentAgreementDetails.location} />
          <DetailLine label="Appearance" value={agreement.talentAgreementDetails.appearanceDescription} />
          <p>
            Fee:{" "}
            {formatFeeLabel(
              agreement.talentAgreementDetails.feeAmount,
              agreement.talentAgreementDetails.feeType
            )}
          </p>
          <DetailLine label="Usage" value={agreement.talentAgreementDetails.usageScope} />
          {formatPayeeTaxBlock(agreement.talentAgreementDetails.payeeTax).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </DetailSection>
      )}

      {meta.isContractor && agreement.contractorAgreementDetails && (
        <DetailSection title="Contractor Services">
          <DetailLine label="Role" value={agreement.contractorAgreementDetails.contractorRole} />
          {(agreement.contractorAgreementDetails.serviceStartDate ||
            agreement.contractorAgreementDetails.serviceEndDate) && (
            <p>
              Service period: {agreement.contractorAgreementDetails.serviceStartDate || "—"} through{" "}
              {agreement.contractorAgreementDetails.serviceEndDate || "—"}
            </p>
          )}
          <DetailLine label="Services" value={agreement.contractorAgreementDetails.servicesDescription} />
          <p>
            Fee:{" "}
            {formatFeeLabel(
              agreement.contractorAgreementDetails.feeAmount,
              agreement.contractorAgreementDetails.feeType
            )}
          </p>
          {formatPayeeTaxBlock(agreement.contractorAgreementDetails.payeeTax).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </DetailSection>
      )}

      {meta.isLocation && agreement.locationAgreementDetails && (
        <DetailSection title="Location & Prop">
          <p>Covers: {formatLocationKindLabel(agreement.locationAgreementDetails.agreementKind)}</p>
          <DetailLine label="Property" value={agreement.locationAgreementDetails.propertyName} />
          <DetailLine label="Address" value={agreement.locationAgreementDetails.propertyAddress} />
          {(agreement.locationAgreementDetails.useStartDate ||
            agreement.locationAgreementDetails.useEndDate) && (
            <p>
              Use period: {agreement.locationAgreementDetails.useStartDate || "—"} through{" "}
              {agreement.locationAgreementDetails.useEndDate || "—"}
            </p>
          )}
          <DetailLine label="Shoot dates" value={agreement.locationAgreementDetails.shootDates} />
          <DetailLine label="Permitted use" value={agreement.locationAgreementDetails.permittedUse} />
          <DetailLine label="Restrictions" value={agreement.locationAgreementDetails.restrictions} />
          {agreement.locationAgreementDetails.agreementKind !== "prop" && (
            <p>
              Location fee: {formatCurrency(calculateLocationFeeTotal(agreement.locationAgreementDetails))}
              {agreement.locationAgreementDetails.locationFeeType === "day" &&
                agreement.locationAgreementDetails.locationDays != null && (
                  <>
                    {" "}
                    ({formatCurrency(agreement.locationAgreementDetails.locationFee)}/day ×{" "}
                    {agreement.locationAgreementDetails.locationDays} days)
                  </>
                )}
            </p>
          )}
          {agreement.locationAgreementDetails.agreementKind !== "location" &&
            agreement.locationAgreementDetails.propLineItems.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="font-semibold text-slate-800">Prop schedule</p>
                {agreement.locationAgreementDetails.propLineItems.map((item) => (
                  <p key={item.id}>
                    {item.quantity}x {item.name} — {formatCurrency(item.dailyRate)}/day × {item.days}{" "}
                    day(s) = {formatCurrency(item.lineTotal)}
                  </p>
                ))}
                <p>Props subtotal: {formatCurrency(calculatePropsSubtotal(agreement.locationAgreementDetails.propLineItems))}</p>
              </div>
            )}
          <p className="font-semibold">
            Total: {formatCurrency(calculateLocationAgreementTotal(agreement.locationAgreementDetails))}
          </p>
          {agreement.locationAgreementDetails.insuranceRequired && (
            <>
              <p>Insurance required: Yes</p>
              {agreement.locationAgreementDetails.insuranceNotes && (
                <p>{agreement.locationAgreementDetails.insuranceNotes}</p>
              )}
            </>
          )}
          {formatPayeeTaxBlock(agreement.locationAgreementDetails.payeeTax).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </DetailSection>
      )}

      {meta.isInternal && agreement.roles.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-900">
            Roles and Responsibilities
          </h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {agreement.roles.map((role) => (
              <li key={role.id}>
                <p className="font-medium">
                  {role.personOrCompanyName} — {role.role}
                </p>
                <ul className="ml-4 list-disc">
                  {role.responsibilities.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {agreement.deliverables.length > 0 && !meta.isRental && !meta.isPayee && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-900">Deliverables</h2>
          <ul className="list-inside list-disc text-sm text-slate-700">
            {agreement.deliverables.map((d) => (
              <li key={d.id}>
                {d.quantity}x {d.name}
                {d.format ? ` (${d.format})` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {meta.isInternal && agreement.payoutDetails && (
        <DetailSection title="Payment Breakdown">
          <p>Total project fee: {formatCurrency(agreement.payoutDetails.totalProjectFee)}</p>
          {agreement.payoutDetails.insightFeeAmount != null && (
            <p>
              Insight fee: {formatCurrency(agreement.payoutDetails.insightFeeAmount)} (
              {agreement.payoutDetails.insightFeePercentage || 0}%)
            </p>
          )}
          {agreement.payoutDetails.aveFeeAmount != null && (
            <p>Partner fee: {formatCurrency(agreement.payoutDetails.aveFeeAmount)}</p>
          )}
          {agreement.payoutDetails.assistantFeeAmount != null && (
            <p>Assistant: {formatCurrency(agreement.payoutDetails.assistantFeeAmount)}</p>
          )}
          {agreement.payoutDetails.talentFeeAmount != null && (
            <p>Talent: {formatCurrency(agreement.payoutDetails.talentFeeAmount)}</p>
          )}
          {agreement.payoutDetails.editorFeeAmount != null && (
            <p>Editor: {formatCurrency(agreement.payoutDetails.editorFeeAmount)}</p>
          )}
          {agreement.payoutDetails.expensesAmount != null && (
            <p>Expenses: {formatCurrency(agreement.payoutDetails.expensesAmount)}</p>
          )}
        </DetailSection>
      )}

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-900">Commercial Terms</h2>
        <div className="space-y-1 text-sm text-slate-700">
          <p>Payment structure: {agreement.paymentTerms.paymentStructure}</p>
          {(() => {
            const promoted = hasPaymentPromotion(agreement.paymentTerms);
            const dueTerms = effectivePaymentTerms(agreement.paymentTerms);
            if (promoted) {
              return (
                <>
                  <p>List price: {formatCurrency(agreement.paymentTerms.totalFee)}</p>
                  <p>{formatPromotionLabel(agreement.paymentTerms)}</p>
                  <p>Amount due: {formatCurrency(dueTerms.totalFee)}</p>
                  {dueTerms.depositAmount != null && (
                    <p>Deposit: {formatCurrency(dueTerms.depositAmount)}</p>
                  )}
                  {dueTerms.balanceAmount != null && (
                    <p>Balance: {formatCurrency(dueTerms.balanceAmount)}</p>
                  )}
                </>
              );
            }
            return (
              <>
                <p>Total fee: {formatCurrency(agreement.paymentTerms.totalFee)}</p>
                {agreement.paymentTerms.depositAmount != null && (
                  <p>Deposit: {formatCurrency(agreement.paymentTerms.depositAmount)}</p>
                )}
                {agreement.paymentTerms.balanceAmount != null && (
                  <p>Balance: {formatCurrency(agreement.paymentTerms.balanceAmount)}</p>
                )}
              </>
            );
          })()}
          {!meta.isRental && !meta.isPayee && (
            <>
              <p>
                Revisions: {agreement.revisionPolicy.includedRevisionRounds} round(s) within{" "}
                {agreement.revisionPolicy.revisionRequestWindowDays} days
              </p>
              <p>
                Organic social: {agreement.usageRights.organicSocialIncluded ? "Included" : "Not included"}
              </p>
              <p>Website use: {agreement.usageRights.websiteUseIncluded ? "Included" : "Not included"}</p>
              <p>
                Paid advertising:{" "}
                {agreement.usageRights.paidAdsIncluded
                  ? "Included"
                  : "Not included — separate written approval required"}
              </p>
              <p>
                Full buyout:{" "}
                {agreement.usageRights.fullBuyout ? "Included as stated" : "Not included unless expressly stated"}
              </p>
              <p>
                Raw footage included: {agreement.rawFootagePolicy.rawFootageIncluded ? "Yes" : "No"}
              </p>
            </>
          )}
          {agreement.cancellationPolicy.rescheduleAllowed &&
            agreement.cancellationPolicy.rescheduleNoticeRequiredHours != null && (
              <p>
                Reschedule notice: at least {agreement.cancellationPolicy.rescheduleNoticeRequiredHours} hours
              </p>
            )}
        </div>
      </section>
    </>
  );
}
