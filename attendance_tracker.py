"""
╔══════════════════════════════════════════════════╗
║          📚 Lecture Attendance Tracker           ║
╚══════════════════════════════════════════════════╝

Track your attended lectures across all subjects,
view attendance percentages, and stay on top of
your academics.

Data is saved automatically to attendance_data.json.
"""

import json
import os
from datetime import datetime

# ─── File path for persistent storage ───
DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "attendance_data.json")

# ─── ANSI Color Codes ───
class Colors:
    RESET   = "\033[0m"
    BOLD    = "\033[1m"
    DIM     = "\033[2m"
    RED     = "\033[91m"
    GREEN   = "\033[92m"
    YELLOW  = "\033[93m"
    BLUE    = "\033[94m"
    MAGENTA = "\033[95m"
    CYAN    = "\033[96m"
    WHITE   = "\033[97m"
    BG_BLUE = "\033[44m"
    BG_RED  = "\033[41m"
    BG_GREEN= "\033[42m"


def colored(text, color):
    return f"{color}{text}{Colors.RESET}"


# ═══════════════════════════════════════════════════
#  Data Persistence
# ═══════════════════════════════════════════════════

def load_data():
    """Load attendance data from JSON file."""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            print(colored("  ⚠  Data file corrupted. Starting fresh.", Colors.YELLOW))
    return {"subjects": {}}


def save_data(data):
    """Save attendance data to JSON file."""
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


# ═══════════════════════════════════════════════════
#  Display Helpers
# ═══════════════════════════════════════════════════

def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")


def print_header():
    print()
    print(colored("  ╔══════════════════════════════════════════════════╗", Colors.CYAN))
    print(colored("  ║", Colors.CYAN) + colored("          📚 Lecture Attendance Tracker           ", Colors.BOLD + Colors.WHITE) + colored("║", Colors.CYAN))
    print(colored("  ╚══════════════════════════════════════════════════╝", Colors.CYAN))
    print()


def print_menu():
    print(colored("  ┌──────────────────────────────────────┐", Colors.BLUE))
    print(colored("  │", Colors.BLUE) + colored("         M A I N   M E N U              ", Colors.BOLD + Colors.WHITE) + colored("│", Colors.BLUE))
    print(colored("  ├──────────────────────────────────────┤", Colors.BLUE))
    print(colored("  │", Colors.BLUE) + colored("  1 ", Colors.GREEN) + "│ Add a New Subject             " + colored("│", Colors.BLUE))
    print(colored("  │", Colors.BLUE) + colored("  2 ", Colors.GREEN) + "│ Mark Attendance               " + colored("│", Colors.BLUE))
    print(colored("  │", Colors.BLUE) + colored("  3 ", Colors.GREEN) + "│ View Attendance Summary       " + colored("│", Colors.BLUE))
    print(colored("  │", Colors.BLUE) + colored("  4 ", Colors.GREEN) + "│ View Detailed Subject Report  " + colored("│", Colors.BLUE))
    print(colored("  │", Colors.BLUE) + colored("  5 ", Colors.GREEN) + "│ Remove a Subject              " + colored("│", Colors.BLUE))
    print(colored("  │", Colors.BLUE) + colored("  6 ", Colors.GREEN) + "│ Reset All Data                " + colored("│", Colors.BLUE))
    print(colored("  │", Colors.BLUE) + colored("  0 ", Colors.RED)   + "│ Exit                          " + colored("│", Colors.BLUE))
    print(colored("  └──────────────────────────────────────┘", Colors.BLUE))
    print()


def get_attendance_color(percentage):
    """Return color based on attendance percentage."""
    if percentage >= 75:
        return Colors.GREEN
    elif percentage >= 60:
        return Colors.YELLOW
    else:
        return Colors.RED


def progress_bar(percentage, width=20):
    """Create a visual progress bar."""
    filled = int(width * percentage / 100)
    empty = width - filled
    color = get_attendance_color(percentage)
    bar = colored("█" * filled, color) + colored("░" * empty, Colors.DIM)
    return f"[{bar}]"


def list_subjects(data, prompt_text="Select a subject"):
    """Display numbered list of subjects and return selection."""
    subjects = list(data["subjects"].keys())
    if not subjects:
        print(colored("\n  ⚠  No subjects found. Add a subject first!\n", Colors.YELLOW))
        return None

    print(colored(f"\n  ── {prompt_text} ──\n", Colors.CYAN))
    for i, subject in enumerate(subjects, 1):
        info = data["subjects"][subject]
        total = info["total"]
        attended = info["attended"]
        pct = (attended / total * 100) if total > 0 else 0
        color = get_attendance_color(pct)
        print(f"    {colored(str(i), Colors.GREEN)}. {colored(subject, Colors.WHITE)}  {colored(f'({attended}/{total})', color)}")

    print()
    try:
        choice = int(input(colored("  Enter number: ", Colors.CYAN)))
        if 1 <= choice <= len(subjects):
            return subjects[choice - 1]
        else:
            print(colored("  ✗ Invalid selection.\n", Colors.RED))
            return None
    except ValueError:
        print(colored("  ✗ Please enter a valid number.\n", Colors.RED))
        return None


# ═══════════════════════════════════════════════════
#  Core Features
# ═══════════════════════════════════════════════════

def add_subject(data):
    """Add a new subject to track."""
    print(colored("\n  ── Add New Subject ──\n", Colors.CYAN))
    name = input(colored("  Subject name: ", Colors.CYAN)).strip()

    if not name:
        print(colored("  ✗ Subject name cannot be empty.\n", Colors.RED))
        return

    # Normalize: title case
    name = name.title()

    if name in data["subjects"]:
        print(colored(f"  ✗ '{name}' already exists.\n", Colors.YELLOW))
        return

    data["subjects"][name] = {
        "total": 0,
        "attended": 0,
        "records": []
    }
    save_data(data)
    print(colored(f"  ✔ '{name}' added successfully!\n", Colors.GREEN))


def mark_attendance(data):
    """Mark attendance for a subject."""
    subject = list_subjects(data, "Mark Attendance")
    if subject is None:
        return

    print(colored(f"\n  ── Marking attendance for: {subject} ──\n", Colors.CYAN))
    print(f"    {colored('1', Colors.GREEN)}. ✅ Present")
    print(f"    {colored('2', Colors.RED)}. ❌ Absent")
    print(f"    {colored('3', Colors.YELLOW)}. ➕ Add multiple lectures at once")
    print()

    choice = input(colored("  Your choice: ", Colors.CYAN)).strip()
    today = datetime.now().strftime("%Y-%m-%d %H:%M")

    if choice == "1":
        data["subjects"][subject]["total"] += 1
        data["subjects"][subject]["attended"] += 1
        data["subjects"][subject]["records"].append({
            "date": today,
            "status": "present"
        })
        save_data(data)
        att = data["subjects"][subject]
        pct = att["attended"] / att["total"] * 100
        print(colored(f"\n  ✔ Marked PRESENT for {subject}", Colors.GREEN))
        print(f"    Current: {colored(f'{pct:.1f}%', get_attendance_color(pct))} ({att['attended']}/{att['total']})\n")

    elif choice == "2":
        data["subjects"][subject]["total"] += 1
        data["subjects"][subject]["records"].append({
            "date": today,
            "status": "absent"
        })
        save_data(data)
        att = data["subjects"][subject]
        pct = (att["attended"] / att["total"] * 100) if att["total"] > 0 else 0
        print(colored(f"\n  ✔ Marked ABSENT for {subject}", Colors.RED))
        print(f"    Current: {colored(f'{pct:.1f}%', get_attendance_color(pct))} ({att['attended']}/{att['total']})\n")

    elif choice == "3":
        try:
            total_lec = int(input(colored("  Total lectures held: ", Colors.CYAN)))
            attended_lec = int(input(colored("  Lectures attended:   ", Colors.CYAN)))

            if attended_lec > total_lec:
                print(colored("  ✗ Attended cannot exceed total lectures.\n", Colors.RED))
                return
            if total_lec < 0 or attended_lec < 0:
                print(colored("  ✗ Values cannot be negative.\n", Colors.RED))
                return

            data["subjects"][subject]["total"] += total_lec
            data["subjects"][subject]["attended"] += attended_lec

            # Log bulk entry
            for _ in range(attended_lec):
                data["subjects"][subject]["records"].append({"date": today, "status": "present"})
            for _ in range(total_lec - attended_lec):
                data["subjects"][subject]["records"].append({"date": today, "status": "absent"})

            save_data(data)
            att = data["subjects"][subject]
            pct = (att["attended"] / att["total"] * 100) if att["total"] > 0 else 0
            print(colored(f"\n  ✔ Added {total_lec} lectures ({attended_lec} present, {total_lec - attended_lec} absent)", Colors.GREEN))
            print(f"    Current: {colored(f'{pct:.1f}%', get_attendance_color(pct))} ({att['attended']}/{att['total']})\n")

        except ValueError:
            print(colored("  ✗ Please enter valid numbers.\n", Colors.RED))
    else:
        print(colored("  ✗ Invalid choice.\n", Colors.RED))


def view_summary(data):
    """Display attendance summary for all subjects."""
    if not data["subjects"]:
        print(colored("\n  ⚠  No subjects found. Add a subject first!\n", Colors.YELLOW))
        return

    print(colored("\n  ══════════════════════════════════════════════════", Colors.CYAN))
    print(colored("              📊 Attendance Summary", Colors.BOLD + Colors.WHITE))
    print(colored("  ══════════════════════════════════════════════════\n", Colors.CYAN))

    total_all = 0
    attended_all = 0

    # Table header
    print(f"  {'Subject':<22} {'Attended':>10} {'Percentage':>12}  {'Progress'}")
    print(colored("  " + "─" * 70, Colors.DIM))

    for subject, info in data["subjects"].items():
        total = info["total"]
        attended = info["attended"]
        total_all += total
        attended_all += attended

        if total > 0:
            pct = attended / total * 100
        else:
            pct = 0.0

        color = get_attendance_color(pct)
        bar = progress_bar(pct)

        status_icon = "🟢" if pct >= 75 else ("🟡" if pct >= 60 else "🔴")

        att_str = f"{attended}/{total}"
        pct_str = f"{pct:>5.1f}%"
        print(f"  {status_icon} {subject:<20} {colored(att_str.rjust(8), Colors.WHITE)}   {colored(pct_str, color)}   {bar}")

    print(colored("  " + "─" * 70, Colors.DIM))

    # Overall
    if total_all > 0:
        overall_pct = attended_all / total_all * 100
    else:
        overall_pct = 0.0

    overall_color = get_attendance_color(overall_pct)
    overall_label = colored('OVERALL', Colors.BOLD + Colors.WHITE)
    overall_att_str = f"{attended_all}/{total_all}"
    overall_pct_str = f"{overall_pct:>5.1f}%"
    print(f"\n  {overall_label:>25} {colored(overall_att_str.rjust(8), Colors.WHITE)}   {colored(overall_pct_str, overall_color)}   {progress_bar(overall_pct)}")

    # Warnings
    if overall_pct < 75 and total_all > 0:
        deficit = int(0.75 * total_all) - attended_all
        if deficit > 0:
            # How many consecutive lectures needed to reach 75%
            # (attended_all + x) / (total_all + x) >= 0.75
            # attended_all + x >= 0.75 * total_all + 0.75x
            # 0.25x >= 0.75 * total_all - attended_all
            # x >= (0.75 * total_all - attended_all) / 0.25
            needed = int((0.75 * total_all - attended_all) / 0.25)
            if needed < 0:
                needed = 0
            print(colored(f"\n  ⚠  You need to attend {needed} more consecutive lectures to reach 75% overall!", Colors.YELLOW))

    print()


def view_detailed_report(data):
    """Show detailed report for a single subject."""
    subject = list_subjects(data, "View Detailed Report")
    if subject is None:
        return

    info = data["subjects"][subject]
    total = info["total"]
    attended = info["attended"]
    absent = total - attended
    pct = (attended / total * 100) if total > 0 else 0
    color = get_attendance_color(pct)

    print(colored(f"\n  ══════════════════════════════════════════════════", Colors.CYAN))
    print(colored(f"              📋 Report: {subject}", Colors.BOLD + Colors.WHITE))
    print(colored(f"  ══════════════════════════════════════════════════\n", Colors.CYAN))

    print(f"    Total Lectures   : {colored(str(total), Colors.WHITE)}")
    print(f"    Attended         : {colored(str(attended), Colors.GREEN)}")
    print(f"    Absent           : {colored(str(absent), Colors.RED)}")
    print(f"    Attendance       : {colored(f'{pct:.1f}%', color)}  {progress_bar(pct, 25)}")

    # Status message
    if pct >= 75:
        can_miss = int((attended - 0.75 * total) / 0.75)
        print(colored(f"\n    ✔ You're safe! You can miss {can_miss} more lecture(s) and stay ≥75%.", Colors.GREEN))
    elif total > 0:
        needed = int((0.75 * total - attended) / 0.25)
        if needed < 0:
            needed = 0
        print(colored(f"\n    ⚠ Below 75%! Attend {needed} consecutive lectures to reach 75%.", Colors.YELLOW))

    # Recent records
    records = info.get("records", [])
    if records:
        print(colored(f"\n    ── Recent Lecture Log (last 10) ──\n", Colors.CYAN))
        for rec in records[-10:]:
            icon = colored("✅ Present", Colors.GREEN) if rec["status"] == "present" else colored("❌ Absent", Colors.RED)
            print(f"      {colored(rec['date'], Colors.DIM)}  {icon}")

    print()


def remove_subject(data):
    """Remove a subject from tracking."""
    subject = list_subjects(data, "Remove Subject")
    if subject is None:
        return

    confirm = input(colored(f"  ⚠ Are you sure you want to remove '{subject}'? (y/n): ", Colors.YELLOW)).strip().lower()
    if confirm == "y":
        del data["subjects"][subject]
        save_data(data)
        print(colored(f"  ✔ '{subject}' removed.\n", Colors.GREEN))
    else:
        print(colored("  ✗ Cancelled.\n", Colors.DIM))


def reset_data(data):
    """Reset all attendance data."""
    print(colored("\n  ⚠ WARNING: This will delete ALL your attendance data!", Colors.RED + Colors.BOLD))
    confirm = input(colored("  Type 'RESET' to confirm: ", Colors.RED)).strip()
    if confirm == "RESET":
        data["subjects"] = {}
        save_data(data)
        print(colored("  ✔ All data has been reset.\n", Colors.GREEN))
    else:
        print(colored("  ✗ Reset cancelled.\n", Colors.DIM))


# ═══════════════════════════════════════════════════
#  Main Loop
# ═══════════════════════════════════════════════════

def main():
    data = load_data()

    while True:
        clear_screen()
        print_header()
        print_menu()

        choice = input(colored("  ➤ Enter your choice: ", Colors.CYAN)).strip()

        if choice == "1":
            add_subject(data)
        elif choice == "2":
            mark_attendance(data)
        elif choice == "3":
            view_summary(data)
        elif choice == "4":
            view_detailed_report(data)
        elif choice == "5":
            remove_subject(data)
        elif choice == "6":
            reset_data(data)
        elif choice == "0":
            print(colored("\n  👋 Goodbye! Keep attending those lectures!\n", Colors.CYAN))
            break
        else:
            print(colored("  ✗ Invalid option. Try again.\n", Colors.RED))

        input(colored("  Press Enter to continue...", Colors.DIM))


if __name__ == "__main__":
    main()
