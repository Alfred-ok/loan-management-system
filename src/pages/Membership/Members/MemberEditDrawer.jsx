import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import Drawer from "@/components/ui/Drawer";
import { Button, Tabs } from "@/components/ui";
import { useData } from "@/context/DataContext";
import { errorAlert, toast } from "@/lib/alert";
import { fullName } from "@/lib/format";
import { initialCustomerState, initialNextOfKin } from "./MemberRegistrationContext";
import MemberFormSteps, { MEMBER_STEPS, validateMember } from "./MemberFormSteps";

export default function MemberEditDrawer({ member, open, onClose }) {
    const { updateMember, idNumberTaken } = useData();
    const [customer, setCustomer] = useState(initialCustomerState);
    const [nextOfKins, setNextOfKins] = useState([{ ...initialNextOfKin }]);
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (open && member) {
            const { nextOfKins: kins, ...rest } = member;
            setCustomer({ ...initialCustomerState, ...rest });
            setNextOfKins(kins?.length ? kins.map((k) => ({ ...k })) : [{ ...initialNextOfKin }]);
            setStep(1);
            setErrors({});
        }
    }, [open, member]);

    useEffect(() => {
        if (member && Object.values(errors).some(Boolean))
            setErrors(validateMember(0, customer, nextOfKins, idNumberTaken(customer.individualIdentityCardNumber, member.id)));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customer, nextOfKins]);

    const handleSave = () => {
        const errs = validateMember(0, customer, nextOfKins, idNumberTaken(customer.individualIdentityCardNumber, member.id));
        setErrors(errs);
        if (Object.keys(errs).length) {
            setStep(Object.keys(errs).every((k) => k.startsWith("nok")) ? 3 : 1);
            errorAlert(new Error(Object.values(errs)[0]), "Check the form");
            return;
        }
        try {
            // Drop registration-only fields before saving
            const { initialShares, initialDeposit, registrationFee, ...record } = customer;
            updateMember(member.id, record, nextOfKins);
            toast("Member details updated");
            onClose();
        } catch (err) {
            errorAlert(err);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={`Edit Member — ${fullName(member)}`}
            subtitle={member?.memberNumber}
            width="max-w-6xl"
            footer={
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="success" onClick={handleSave}>
                        <Check className="w-4 h-4" /> Save Changes
                    </Button>
                </div>
            }
        >
            <Tabs
                className="mb-4"
                value={step}
                onChange={setStep}
                tabs={MEMBER_STEPS.map((label, i) => ({ value: i + 1, label: i === 3 ? "Uploads" : label }))}
            />
            <MemberFormSteps
                step={step}
                customer={customer}
                setCustomer={setCustomer}
                nextOfKins={nextOfKins}
                setNextOfKins={setNextOfKins}
                errors={errors}
                mode="edit"
            />
        </Drawer>
    );
}
