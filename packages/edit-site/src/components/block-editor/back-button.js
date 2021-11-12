/**
 * WordPress dependencies
 */
import { Button } from '@wordpress/components';
import { arrowLeft } from '@wordpress/icons';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { store as editSiteStore } from '../../store';
import { back } from '../routes/history';

function BackButton() {
	const { isTemplatePart, previousTemplateId } = useSelect( ( select ) => {
		const { getEditedPostType, getPreviousEditedPostId } = select(
			editSiteStore
		);

		return {
			isTemplatePart: getEditedPostType() === 'wp_template_part',
			previousTemplateId: getPreviousEditedPostId(),
		};
	}, [] );

	if ( ! isTemplatePart || ! previousTemplateId ) {
		return null;
	}

	return (
		<Button
			className="edit-site-visual-editor__back-button"
			icon={ arrowLeft }
			onClick={ () => {
				back();
			} }
		>
			{ __( 'Back' ) }
		</Button>
	);
}

export default BackButton;
