// Copyright (c) 2024-2026 Aminy LLC. All Rights Reserved.
// CONFIDENTIAL AND PROPRIETARY — Trade Secret of Aminy LLC
// Unauthorized use, reproduction, or distribution is strictly prohibited.
// See LICENSE file for details.

/**
 * Medicaid FMS Export Utility (EVV Compliance)
 * 
 * Handles the generation of highly formatted CSV/EDI files required by 
 * Fiscal Management Services (FMS) like Acumen, DCI, and PPL to process 
 * caregiver timesheets under Self-Directed Medicaid Waivers.
 */

interface EVVTimesheet {
    id: string;
    caregiver_id: string;
    patient_id: string;
    shift_start: string;
    shift_end: string;
    start_latitude: number;
    start_longitude: number;
    end_latitude: number;
    end_longitude: number;
    status: 'in_progress' | 'completed' | 'approved' | 'exported';
}

interface FMSConfig {
    fmsName: 'Acumen' | 'DCI';
    state: string;
    providerId: string;
}

/**
 * Converts ISO 8601 to Acumen's strict `MM/DD/YYYY HH:MM:SS AM/PM` format
 */
const formatAcumenDate = (isoString: string): string => {
    const date = new Date(isoString);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const yyyy = date.getFullYear();

    let hours = date.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hh = String(hours).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');

    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${sec} ${ampm}`;
};

/**
 * Generates an Acumen-formatted EVV CSV String
 * 
 * Columns: EmployeeID, EmployerID, ClientID, ServiceCode, 
 * TimeIn, TimeOut, Exceptions, EVV_In_Lat, EVV_In_Long, EVV_Out_Lat, EVV_Out_Long
 */
export const generateAcumenExport = (timesheets: EVVTimesheet[], config: FMSConfig): string => {
    const headers = [
        "EmployeeID", "EmployerID", "ClientID", "ServiceCode",
        "TimeIn", "TimeOut", "Exceptions",
        "EVV_In_Lat", "EVV_In_Long", "EVV_Out_Lat", "EVV_Out_Long"
    ].join(',');

    const rows = timesheets.map(ts => {
        return [
            ts.caregiver_id,
            config.providerId, // In Self-Directed, the Parent is the Employer
            ts.patient_id,
            "S5125", // Attendant Care State Code (varies by state)
            formatAcumenDate(ts.shift_start),
            formatAcumenDate(ts.shift_end),
            "", // Exceptions (e.g., forgotten punch)
            ts.start_latitude,
            ts.start_longitude,
            ts.end_latitude,
            ts.end_longitude
        ].join(',');
    });

    return [headers, ...rows].join('\n');
};

/**
 * Generates a DCI-formatted EVV CSV String (Alternative FMS)
 * 
 * DCI prefers YYYY-MM-DD and completely different header names.
 */
export const generateDCIExport = (timesheets: EVVTimesheet[], config: FMSConfig): string => {
    const headers = [
        "Worker_UUID", "Client_UUID", "Cost_Center", "Service_Date",
        "Punch_In", "Punch_Out", "GPS_In", "GPS_Out"
    ].join('|'); // DCI often strictly uses pipe delimiters

    const rows = timesheets.map(ts => {
        const dateIn = new Date(ts.shift_start);
        const serviceDate = dateIn.toISOString().split('T')[0]; // YYYY-MM-DD

        const timeIn = dateIn.toISOString().split('T')[1].substring(0, 5); // HH:MM
        const timeOut = new Date(ts.shift_end).toISOString().split('T')[1].substring(0, 5); // HH:MM

        return [
            ts.caregiver_id,
            ts.patient_id,
            config.providerId,
            serviceDate,
            timeIn,
            timeOut,
            `${ts.start_latitude},${ts.start_longitude}`,
            `${ts.end_latitude},${ts.end_longitude}`
        ].join('|');
    });

    return [headers, ...rows].join('\n');
};
